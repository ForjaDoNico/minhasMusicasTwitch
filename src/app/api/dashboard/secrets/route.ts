import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, parseBody } from "@/lib/http";
import type { Database } from "@/lib/database.types";

const Body = z.object({
  streamelementsChannelId: z.string().trim().max(100).optional(),
  streamelementsJwt: z.string().trim().max(2000).optional(),
  regenerateWebhookToken: z.boolean().optional(),
});

/** Owner-only access to channel_secrets (the table has no client policies). */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return json({ ok: false }, 401);
  const body = await parseBody(req, Body);
  if (!body) return json({ ok: false, error: "invalid_body" }, 400);
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id").eq("owner_id", viewer.id).maybeSingle();
  if (!channel) return json({ ok: false }, 404);
  const update: Database["public"]["Tables"]["channel_secrets"]["Update"] = {};
  if (body.streamelementsChannelId !== undefined) update.streamelements_channel_id = body.streamelementsChannelId || null;
  if (body.streamelementsJwt) update.streamelements_jwt = body.streamelementsJwt;
  if (body.regenerateWebhookToken) update.tip_webhook_token = randomBytes(24).toString("hex");
  const { data, error } = await admin.from("channel_secrets").update(update).eq("channel_id", channel.id)
    .select("tip_webhook_token, streamelements_channel_id").single();
  if (error) return json({ ok: false }, 500);
  return json({ ok: true, ...data });
}
