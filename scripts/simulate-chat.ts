/**
 * Send a signed, fake Twitch EventSub `channel.chat.message` to the local webhook.
 *
 *   pnpm simulate:chat "!sr wonderwall" [--user alice] [--badges subscriber,vip] [--broadcaster 100000001]
 *   pnpm simulate:chat --verify          # webhook_callback_verification handshake
 *   pnpm simulate:chat --online|--offline
 *
 * With BOT_DRY_RUN=true the bot's reply is printed in the `next dev` terminal.
 */
import "dotenv/config";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { signEventSub } from "../src/lib/twitch/signature";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name: string) => args.includes(`--${name}`);
const text = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["verify", "online", "offline"].includes(args[i - 1].slice(2))));

const secret = process.env.TWITCH_EVENTSUB_SECRET ?? "";
const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/twitch/eventsub`;
const broadcaster = flag("broadcaster") ?? "100000001";
const user = flag("user") ?? "viewer_" + Math.floor(Math.random() * 1000);
const badges = (flag("badges") ?? "").split(",").filter(Boolean).map((set_id) => ({ set_id, id: "1", info: "" }));

let type = "notification";
let body: Record<string, unknown>;
const subscription = (t: string) => ({ id: randomUUID(), type: t, version: "1", status: "enabled", condition: { broadcaster_user_id: broadcaster } });

if (has("verify")) {
  type = "webhook_callback_verification";
  body = { challenge: "pogchamp-kappa-360noscope-vohiyo", subscription: subscription("channel.chat.message") };
} else if (has("online") || has("offline")) {
  const t = has("online") ? "stream.online" : "stream.offline";
  body = { subscription: subscription(t), event: { broadcaster_user_id: broadcaster, broadcaster_user_login: "demo" } };
} else {
  if (!text) {
    console.error('usage: pnpm simulate:chat "!sr wonderwall" [--user name] [--badges subscriber,vip,moderator]');
    process.exit(1);
  }
  body = {
    subscription: subscription("channel.chat.message"),
    event: {
      broadcaster_user_id: broadcaster,
      broadcaster_user_login: "demo",
      chatter_user_id: "sim-" + user,
      chatter_user_login: user.toLowerCase(),
      chatter_user_name: user,
      message_id: randomUUID(),
      message: { text },
      badges,
    },
  };
}

const raw = JSON.stringify(body);
const id = randomUUID();
const timestamp = new Date().toISOString();
const res = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "twitch-eventsub-message-id": id,
    "twitch-eventsub-message-timestamp": timestamp,
    "twitch-eventsub-message-signature": signEventSub(secret, id, timestamp, raw),
    "twitch-eventsub-message-type": type,
  },
  body: raw,
});
console.log(`${res.status} ${await res.text()}`);
