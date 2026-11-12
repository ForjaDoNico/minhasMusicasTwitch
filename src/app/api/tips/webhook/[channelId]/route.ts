import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, parseBody } from "@/lib/http";
import { ingestTip } from "@/lib/tips";

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().length(3).optional(),
  message: z.string().max(500).optional().nullable(),
  id: z.string().max(200).optional(),
});

/**
 * Generic tip webhook. Authenticate with ?token=… or the X-Webhook-Token header (token shown in the dashboard).
 * Works with automations (Pipedream/Zapier/Make), Ko-fi-style webhooks, StreamElements/Streamlabs relays…
 */
export async function POST(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  if (!z.guid().safeParse(channelId).success) return json({ ok: false }, 404);
  const token = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-webhook-token") ?? "";
  const { data: secret } = await supabaseAdmin().from("channel_secrets").select("tip_webhook_token").eq("channel_id", channelId).maybeSingle();
  const a = Buffer.from(token);
  const b = Buffer.from(secret?.tip_webhook_token ?? "");
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false, error: "unauthorized" }, 401);

  const body = await parseBody(req, Body);
  if (!body) return json({ ok: false, error: "invalid_body" }, 400);
  const result = await ingestTip(channelId, {
    name: body.name,
    amount: body.amount,
    currency: body.currency,
    message: body.message,
    externalId: body.id ?? null,
    provider: "webhook",
  });
  return json({ ok: true, ...result });
}
