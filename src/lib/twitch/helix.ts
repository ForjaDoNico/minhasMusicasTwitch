import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { APP_URL, serverEnv } from "@/lib/env";

let memoryToken: { token: string; expiresAt: number } | null = null;

/** App access token (client credentials), cached in memory and in Postgres across cold starts. */
export async function getAppToken(): Promise<string> {
  const now = Date.now();
  if (memoryToken && memoryToken.expiresAt - 60_000 > now) return memoryToken.token;
  const admin = supabaseAdmin();
  const { data } = await admin.from("app_tokens").select("*").eq("id", "twitch_app").maybeSingle();
  if (data && Date.parse(data.expires_at) - 60_000 > now) {
    memoryToken = { token: data.access_token, expiresAt: Date.parse(data.expires_at) };
    return data.access_token;
  }
  const env = serverEnv();
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.twitchClientId, client_secret: env.twitchClientSecret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Twitch token error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = now + json.expires_in * 1000;
  memoryToken = { token: json.access_token, expiresAt };
  await admin.from("app_tokens").upsert({ id: "twitch_app", access_token: json.access_token, expires_at: new Date(expiresAt).toISOString() });
  return json.access_token;
}

async function helix(path: string, init: RequestInit = {}) {
  const env = serverEnv();
  const token = await getAppToken();
  return fetch(`https://api.twitch.tv/helix${path}`, {
    ...init,
    headers: { "client-id": env.twitchClientId, authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
}

/** Which Twitch user sends chat messages: the configured bot account, or the broadcaster itself. */
export function botSenderId(broadcasterId: string) {
  return serverEnv().botUserId || broadcasterId;
}

/** POST /helix/chat/messages (app token + user:bot / channel:bot authorizations). */
export async function sendChatMessage(broadcasterId: string, message: string, replyTo?: string) {
  const text = message.length > 500 ? message.slice(0, 497) + "…" : message;
  if (!text) return;
  if (serverEnv().botDryRun) {
    console.log(`[bot dry-run] #${broadcasterId}: ${text}`);
    return;
  }
  const res = await helix("/chat/messages", {
    method: "POST",
    body: JSON.stringify({ broadcaster_id: broadcasterId, sender_id: botSenderId(broadcasterId), message: text, reply_parent_message_id: replyTo }),
  });
  if (!res.ok) console.error("send chat failed", res.status, await res.text());
}

export const EVENTSUB_CALLBACK = () => `${APP_URL}/api/twitch/eventsub`;

/** Subscribe a channel to chat messages + stream online/offline (webhook transport). */
export async function createChannelSubscriptions(broadcasterId: string): Promise<string[]> {
  const env = serverEnv();
  const transport = { method: "webhook", callback: EVENTSUB_CALLBACK(), secret: env.eventsubSecret };
  const subs = [
    { type: "channel.chat.message", version: "1", condition: { broadcaster_user_id: broadcasterId, user_id: botSenderId(broadcasterId) } },
    { type: "stream.online", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "stream.offline", version: "1", condition: { broadcaster_user_id: broadcasterId } },
  ];
  const ids: string[] = [];
  for (const sub of subs) {
    const res = await helix("/eventsub/subscriptions", { method: "POST", body: JSON.stringify({ ...sub, transport }) });
    if (res.status === 409) continue; // already exists
    if (!res.ok) throw new Error(`EventSub ${sub.type} failed (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as { data: { id: string }[] };
    ids.push(json.data[0].id);
  }
  return ids;
}

export async function deleteSubscriptions(ids: string[]) {
  await Promise.all(ids.map((id) => helix(`/eventsub/subscriptions?id=${encodeURIComponent(id)}`, { method: "DELETE" })));
}

/** Delete every subscription of this app for a broadcaster (used on disconnect / re-connect). */
export async function deleteAllForBroadcaster(broadcasterId: string) {
  let cursor: string | undefined;
  const ids: string[] = [];
  do {
    const res = await helix(`/eventsub/subscriptions${cursor ? `?after=${cursor}` : ""}`);
    if (!res.ok) break;
    const json = (await res.json()) as { data: { id: string; condition: Record<string, string> }[]; pagination?: { cursor?: string } };
    ids.push(...json.data.filter((s) => s.condition.broadcaster_user_id === broadcasterId).map((s) => s.id));
    cursor = json.pagination?.cursor;
  } while (cursor);
  await deleteSubscriptions(ids);
}
