import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { EVENTSUB_HEADERS, isFreshTimestamp, verifyEventSubSignature } from "@/lib/twitch/signature";
import { handleChatMessage, type ChatMessageEvent } from "@/lib/twitch/bot";

export const maxDuration = 30;

interface EventSubPayload {
  challenge?: string;
  subscription: { id: string; type: string; status: string; condition: Record<string, string> };
  event?: Record<string, unknown>;
}

/** Twitch EventSub webhook: chat messages (bot) and stream online/offline (sessions). */
export async function POST(req: Request) {
  const raw = await req.text();
  const h = req.headers;
  const id = h.get(EVENTSUB_HEADERS.id) ?? "";
  const timestamp = h.get(EVENTSUB_HEADERS.timestamp) ?? "";
  const signature = h.get(EVENTSUB_HEADERS.signature) ?? "";
  const type = h.get(EVENTSUB_HEADERS.type) ?? "";

  if (!verifyEventSubSignature(serverEnv().eventsubSecret, id, timestamp, raw, signature)) {
    return new Response("invalid signature", { status: 403 });
  }
  if (!isFreshTimestamp(timestamp)) return new Response("stale message", { status: 403 });

  const payload = JSON.parse(raw) as EventSubPayload;

  if (type === "webhook_callback_verification") {
    return new Response(payload.challenge ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }

  const admin = supabaseAdmin();

  // idempotency: Twitch may resend the same message id
  const { data: isNew, error } = await admin.rpc("claim_eventsub_message", { p_message_id: id });
  if (error) return new Response("db error", { status: 500 }); // let Twitch retry
  if (!isNew) return new Response(null, { status: 204 });

  if (type === "revocation") {
    const broadcaster = payload.subscription.condition.broadcaster_user_id;
    if (payload.subscription.type === "channel.chat.message" && broadcaster) {
      await admin.from("channels").update({ bot_enabled: false }).eq("twitch_id", broadcaster);
    }
    return new Response(null, { status: 204 });
  }

  if (type === "notification" && payload.event) {
    const subType = payload.subscription.type;
    const event = payload.event;
    // answer Twitch right away; the work continues within this function's lifetime
    after(async () => {
      try {
        if (subType === "channel.chat.message") {
          await handleChatMessage(event as unknown as ChatMessageEvent);
        } else if (subType === "stream.online" || subType === "stream.offline") {
          const { data: channel } = await admin.from("channels").select("id")
            .eq("twitch_id", String(event.broadcaster_user_id)).maybeSingle();
          if (channel) await admin.rpc("bot_set_live", { p_channel_id: channel.id, p_live: subType === "stream.online" });
        }
      } catch (e) {
        console.error("eventsub handler error", e);
      }
    });
  }
  return new Response(null, { status: 204 });
}
