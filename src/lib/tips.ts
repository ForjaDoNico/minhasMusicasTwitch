import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { matchSong } from "@/lib/fuzzy";

export interface IncomingTip {
  name: string;
  amount: number;
  currency?: string;
  message?: string | null;
  externalId?: string | null;
  provider: string;
}

/**
 * Record a tip (idempotent per provider+external id). If the tip message names a song from the
 * songlist, it is requested with the tip amount (priority rules apply).
 */
export async function ingestTip(channelId: string, tip: IncomingTip): Promise<{ inserted: boolean; requested?: boolean }> {
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id, current_session_id, settings").eq("id", channelId).single();
  if (!channel) return { inserted: false };

  const { data: inserted, error } = await admin
    .from("tips")
    .upsert(
      {
        channel_id: channelId,
        stream_session_id: channel.current_session_id,
        donor_name: tip.name.slice(0, 100) || "Anonymous",
        amount: tip.amount,
        currency: tip.currency ?? (channel.settings as { currency?: string })?.currency ?? "BRL",
        message: tip.message?.slice(0, 500) ?? null,
        provider: tip.provider,
        external_id: tip.externalId ?? null,
      },
      { onConflict: "channel_id,provider,external_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  if (!inserted || inserted.length === 0) return { inserted: false };

  if (tip.message) {
    const { data: songs } = await admin.from("songs").select("id, title, artist").eq("channel_id", channelId);
    const match = matchSong(tip.message, songs ?? []);
    if (match.kind === "match") {
      const { data } = await admin.rpc("request_song", {
        p_channel_id: channelId,
        p_song_id: match.song.id,
        p_source: "SITE",
        p_requester_name: tip.name,
        p_note: tip.message.slice(0, 300),
        p_tip_amount: tip.amount,
      });
      const r = data as { ok: boolean; item_id?: string } | null;
      if (r?.ok && r.item_id) await admin.from("tips").update({ queue_item_id: r.item_id }).eq("id", inserted[0].id);
      return { inserted: true, requested: !!r?.ok };
    }
  }
  // tips without a song still count for the "Gorjetas nesta live" metric → bump realtime
  await admin.rpc("_touch_channel", { p_channel_id: channelId });
  return { inserted: true };
}
