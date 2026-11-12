import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";
import { json, parseBody } from "@/lib/http";

const Body = z.object({ songId: z.guid(), favorite: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.twitchId) return json({ ok: false, error: "login_required" }, 401);
  const body = await parseBody(req, Body);
  if (!body) return json({ ok: false, error: "invalid_body" }, 400);
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id").eq("slug", (await params).slug.toLowerCase()).maybeSingle();
  if (!channel) return json({ ok: false, error: "channel_not_found" }, 404);
  const { data: song } = await admin.from("songs").select("id").eq("id", body.songId).eq("channel_id", channel.id).maybeSingle();
  if (!song) return json({ ok: false, error: "song_not_found" }, 404);

  const { error } = body.favorite
    ? await admin.from("favorites").upsert(
        { channel_id: channel.id, song_id: song.id, twitch_id: viewer.twitchId, display_name: viewer.displayName },
        { onConflict: "channel_id,song_id,twitch_id", ignoreDuplicates: true },
      )
    : await admin.from("favorites").delete().eq("song_id", song.id).eq("twitch_id", viewer.twitchId);
  if (error) return json({ ok: false, error: "server_error" }, 500);
  return json({ ok: true });
}
