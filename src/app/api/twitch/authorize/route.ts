import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { APP_URL, serverEnv } from "@/lib/env";
import { getViewer } from "@/lib/auth";

/**
 * Start a Twitch OAuth (authorization code) flow to grant bot permissions.
 *  ?type=channel  streamer grants channel:bot (+ chat scopes when the streamer's own account is the bot)
 *  ?type=bot      the bot account grants user:read:chat user:write:chat user:bot (once, admin)
 * No user token is stored: the bot uses an app access token once these grants exist.
 */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/dashboard", req.url));
  const env = serverEnv();
  const type = new URL(req.url).searchParams.get("type") === "bot" ? "bot" : "channel";
  const chatScopes = ["user:read:chat", "user:write:chat", "user:bot"];
  const scopes = type === "bot" ? chatScopes : env.botUserId ? ["channel:bot"] : ["channel:bot", ...chatScopes];
  const state = `${type}.${randomBytes(16).toString("hex")}`;
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: env.twitchClientId,
    redirect_uri: `${APP_URL}/api/twitch/callback`,
    response_type: "code",
    scope: scopes.join(" "),
    state,
    force_verify: "true",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("twitch_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: APP_URL.startsWith("https"), maxAge: 600, path: "/" });
  return res;
}
