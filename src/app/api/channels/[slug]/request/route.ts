import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { clientIp, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  songId: z.guid(),
  note: z.string().trim().max(300).optional(),
});

/** Song request from the website (logged in or anonymous). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const body = await parseBody(req, Body);
  if (!body) return json({ ok: false, error: "invalid_body" }, 400);

  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id").eq("slug", (await params).slug.toLowerCase()).maybeSingle();
  if (!channel) return json({ ok: false, error: "channel_not_found" }, 404);

  const viewer = await getViewer();
  const who = viewer ? `u:${viewer.id}` : `ip:${clientIp(req)}`;
  if (!(await rateLimit(`site-request:${channel.id}:${who}`, 5, 60))) return json({ ok: false, error: "rate_limited" }, 429);

  let isManager = false;
  if (viewer) {
    const { data } = await (await supabaseServer()).rpc("is_channel_manager", { p_channel_id: channel.id });
    isManager = !!data;
  }

  const { data, error } = await admin.rpc("request_song", {
    p_channel_id: channel.id,
    p_song_id: body.songId,
    p_source: "SITE",
    p_requester_name: viewer?.displayName ?? "Anonymous",
    p_requester_id: viewer?.id,
    p_requester_twitch_id: viewer?.twitchId ?? undefined,
    p_note: body.note,
    p_is_manager: isManager,
  });
  if (error) {
    console.error(error);
    return json({ ok: false, error: "server_error" }, 500);
  }
  const result = data as { ok: boolean };
  return json(result, result.ok ? 200 : 409);
}
