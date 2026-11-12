import { createHmac, timingSafeEqual } from "node:crypto";

export const EVENTSUB_HEADERS = {
  id: "twitch-eventsub-message-id",
  timestamp: "twitch-eventsub-message-timestamp",
  signature: "twitch-eventsub-message-signature",
  type: "twitch-eventsub-message-type",
} as const;

/** Verify Twitch EventSub HMAC-SHA256 signature: hmac(secret, id + timestamp + rawBody). */
export function verifyEventSubSignature(
  secret: string,
  messageId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): boolean {
  if (!secret || !messageId || !timestamp || !signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(messageId + timestamp + rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reject messages older than 10 minutes (replay protection, as recommended by Twitch). */
export function isFreshTimestamp(timestamp: string, now = Date.now()): boolean {
  const t = Date.parse(timestamp);
  return Number.isFinite(t) && Math.abs(now - t) < 10 * 60 * 1000;
}

export function signEventSub(secret: string, messageId: string, timestamp: string, rawBody: string) {
  return "sha256=" + createHmac("sha256", secret).update(messageId + timestamp + rawBody).digest("hex");
}
