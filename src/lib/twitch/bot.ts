import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { APP_URL } from "@/lib/env";
import { findCommand, parseChatCommand, splitNote } from "@/lib/commands";
import { matchSong, rankSongs } from "@/lib/fuzzy";
import { renderTemplate, type TemplateContext } from "@/lib/template";
import { formatAgo } from "@/lib/relative-time";
import { channelSettings, type Channel, type Song } from "@/lib/types";
import { botMessage, isBotMessageKey, type BotLang } from "./bot-messages";
import { sendChatMessage } from "./helix";

/** Subset of the EventSub channel.chat.message event we use. */
export interface ChatMessageEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  message: { text: string };
  badges?: { set_id: string; id: string }[];
}

type SongLite = Pick<Song, "id" | "title" | "artist" | "last_played_at">;
const label = (s: { title: string; artist: string }) => (s.artist ? `${s.title} - ${s.artist}` : s.title);

/**
 * Handle one chat message. Returns the reply that was sent (or null) — handy for tests/simulation.
 */
export async function handleChatMessage(event: ChatMessageEvent): Promise<string | null> {
  const parsed = parseChatCommand(event.message.text);
  if (!parsed) return null;

  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("*").eq("twitch_id", event.broadcaster_user_id).maybeSingle();
  if (!channel || !channel.bot_enabled) return null;

  const { data: commands } = await admin.from("bot_commands").select("*").eq("channel_id", channel.id);
  const command = findCommand(commands ?? [], parsed.trigger);
  if (!command) return null;

  if (command.cooldown_sec > 0) {
    const { data: allowed } = await admin.rpc("use_command_cooldown", { p_command_id: command.id });
    if (!allowed) return null;
  }

  const reply = await runAction(channel, command.action, command.response_template, parsed.args, event).catch((e) => {
    console.error("bot action failed", e);
    return botMessage(channelSettings(channel).botLanguage as BotLang, "generic_error");
  });
  if (reply) await sendChatMessage(event.broadcaster_user_id, reply, event.message_id);
  return reply;
}

async function runAction(
  channel: Channel,
  action: string,
  template: string,
  args: string,
  event: ChatMessageEvent,
): Promise<string | null> {
  const admin = supabaseAdmin();
  const settings = channelSettings(channel);
  const lang = (settings.botLanguage === "pt" ? "pt" : "en") as BotLang;
  const locale = lang === "pt" ? "pt-BR" : "en";
  const badges = new Set((event.badges ?? []).map((b) => b.set_id));
  const isBroadcaster = event.chatter_user_id === event.broadcaster_user_id || badges.has("broadcaster");
  const isMod = isBroadcaster || badges.has("moderator");
  const isSub = badges.has("subscriber") || badges.has("founder");
  const isVip = badges.has("vip");
  const base = `${APP_URL}/t/${channel.slug}`;

  const loadQueue = async () => {
    const { data } = await admin
      .from("queue_items")
      .select("id, status, position, note, requester_name, requester_twitch_id, created_at, song:songs(title, artist)")
      .eq("channel_id", channel.id)
      .in("status", ["QUEUED", "PLAYING"])
      .order("position");
    const rows = (data ?? []).map((r) => ({
      ...r,
      song: r.song ? label(r.song) : "",
      title: r.song?.title ?? "",
      artist: r.song?.artist ?? "",
      requester: r.requester_name,
    }));
    return { now_playing: rows.filter((r) => r.status === "PLAYING"), queue: rows.filter((r) => r.status === "QUEUED") };
  };
  const loadSongs = async (): Promise<SongLite[]> => {
    const { data } = await admin.from("songs").select("id, title, artist, last_played_at").eq("channel_id", channel.id).limit(10000);
    return data ?? [];
  };

  const ctx: TemplateContext = {
    user: event.chatter_user_name,
    channel: channel.display_name,
    songlist_link: `${base}/songs`,
    queue_link: `${base}/queue`,
    commands_link: `${base}/commands`,
    learning_link: `${base}/learning`,
  };
  const render = (extra: TemplateContext = {}) => renderTemplate(template, { ...ctx, ...extra });
  const msg = (key: Parameters<typeof botMessage>[1], vars: Record<string, string | number> = {}) =>
    `@${event.chatter_user_name} ${botMessage(lang, key, { ...vars, learning_link: ctx.learning_link as string })}`;
  const requestError = (result: { error?: string; limit?: number }, song: string) =>
    result.error && isBotMessageKey(result.error) ? msg(result.error, { song, limit: result.limit ?? "" }) : msg("generic_error");

  /** Resolve a free-text query against the songlist, replying for none/ambiguous. */
  const resolveSong = async (query: string): Promise<{ song: SongLite } | { reply: string }> => {
    const match = matchSong(query, await loadSongs());
    if (match.kind === "none") return { reply: msg("not_found", { query }) };
    if (match.kind === "ambiguous")
      return { reply: msg("ambiguous", { options: match.options.map((s, i) => `${i + 1}) ${label(s)}`).join(" · ") }) };
    return { song: match.song };
  };

  switch (action) {
    case "REQUEST":
    case "REPLACE_LAST": {
      const { query, note } = splitNote(args);
      if (!query) return msg("usage_sr");
      const resolved = await resolveSong(query);
      if ("reply" in resolved) return resolved.reply;
      let replaceId: string | undefined;
      let previous = "";
      if (action === "REPLACE_LAST") {
        const { data: last } = await admin
          .from("queue_items")
          .select("id, song:songs(title, artist)")
          .eq("channel_id", channel.id)
          .eq("status", "QUEUED")
          .eq("requester_twitch_id", event.chatter_user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!last) return msg("no_request");
        replaceId = last.id;
        previous = last.song ? label(last.song) : "";
      }
      const { data, error } = await admin.rpc("request_song", {
        p_channel_id: channel.id,
        p_song_id: resolved.song.id,
        p_source: "TWITCH",
        p_requester_name: event.chatter_user_name,
        p_requester_twitch_id: event.chatter_user_id,
        p_note: note ?? undefined,
        p_is_subscriber: isSub,
        p_is_vip: isVip,
        p_is_manager: isMod,
        p_replace_item_id: replaceId,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; position?: number; limit?: number };
      if (!result.ok) return requestError(result, label(resolved.song));
      return render({ song: label(resolved.song), title: resolved.song.title, artist: resolved.song.artist, position: result.position ?? "", previous_song: previous });
    }
    case "REMOVE_LAST": {
      const { data, error } = await admin.rpc("remove_last_request", { p_channel_id: channel.id, p_twitch_id: event.chatter_user_id });
      if (error) throw error;
      const result = data as { ok: boolean; song?: string; position?: number };
      if (!result.ok) return msg("no_request");
      return render({ song: result.song ?? "", position: result.position ?? "" });
    }
    case "CURRENT_SONG":
    case "NEXT_SONG":
    case "SONG_DETAILS":
      return render(await loadQueue());
    case "LAST_SONG": {
      const { data } = await admin.from("play_history").select("song_title, song_artist, requester_name")
        .eq("channel_id", channel.id).order("played_at", { ascending: false }).limit(1).maybeSingle();
      return render(data ? { song: label({ title: data.song_title, artist: data.song_artist }), requester: data.requester_name ?? "" } : {});
    }
    case "PLAYED_TODAY": {
      const { data: stats } = await admin.rpc("channel_stats", { p_channel_id: channel.id });
      return render({ count: (stats as { played_session?: number } | null)?.played_session ?? 0 });
    }
    case "HAS_SONG":
    case "LAST_PLAYED": {
      if (!args) return msg("usage_sr");
      const best = rankSongs(args, await loadSongs(), 1)[0];
      const song = best && best.score >= 0.6 ? best.item : null;
      return render(song
        ? { song: label(song), query: args, time_ago: formatAgo(song.last_played_at, locale) }
        : { query: args });
    }
    case "FAVORITE":
    case "UNFAVORITE": {
      let song: SongLite | null = null;
      if (args) {
        const resolved = await resolveSong(args);
        if ("reply" in resolved) return resolved.reply;
        song = resolved.song;
      } else {
        const { data } = await admin.from("queue_items").select("song:songs(id, title, artist, last_played_at)")
          .eq("channel_id", channel.id).eq("status", "PLAYING").maybeSingle();
        song = data?.song ?? null;
        if (!song) return msg("nothing_playing");
      }
      if (action === "FAVORITE") {
        await admin.from("favorites").upsert(
          { channel_id: channel.id, song_id: song.id, twitch_id: event.chatter_user_id, display_name: event.chatter_user_name },
          { onConflict: "channel_id,song_id,twitch_id", ignoreDuplicates: true },
        );
      } else {
        await admin.from("favorites").delete().eq("song_id", song.id).eq("twitch_id", event.chatter_user_id);
      }
      return render({ song: label(song) });
    }
    case "SONGLIST_LINK":
    case "QUEUE_LINK":
    case "COMMANDS_LINK":
      return render();
    case "CUSTOM":
    default:
      return render(await loadQueue());
  }
}
