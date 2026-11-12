import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";
import { clientIp, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suggest"), title: z.string().trim().min(1).max(200), artist: z.string().trim().max(200).default("") }),
  z.object({ action: z.literal("vote"), id: z.guid() }),
]);

/** Learning list: suggest a song or vote (one vote per Twitch user / IP). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const body = await parseBody(req, Body);
  if (!body) return json({ ok: false, error: "invalid_body" }, 400);
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id").eq("slug", (await params).slug.toLowerCase()).maybeSingle();
  if (!channel) return json({ ok: false, error: "channel_not_found" }, 404);

  const viewer = await getViewer();
  const voterKey = viewer?.twitchId ? `tw:${viewer.twitchId}` : viewer ? `u:${viewer.id}` : `ip:${clientIp(req)}`;
  if (!(await rateLimit(`learning:${channel.id}:${voterKey}`, 10, 60))) return json({ ok: false, error: "rate_limited" }, 429);

  if (body.action === "suggest") {
    const { data, error } = await admin.rpc("suggest_learning", {
      p_channel_id: channel.id,
      p_title: body.title,
      p_artist: body.artist,
      p_requested_by: viewer?.displayName ?? "Anonymous",
      p_voter_key: voterKey,
    });
    if (error) return json({ ok: false, error: "server_error" }, 500);
    return json(data);
  }
  const { data: lr } = await admin.from("learning_requests").select("id").eq("id", body.id).eq("channel_id", channel.id).maybeSingle();
  if (!lr) return json({ ok: false, error: "not_found" }, 404);
  const { data, error } = await admin.rpc("vote_learning", { p_request_id: lr.id, p_voter_key: voterKey });
  if (error) return json({ ok: false, error: "server_error" }, 500);
  return json(data);
}
