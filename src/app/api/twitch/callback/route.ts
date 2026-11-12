import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { APP_URL, serverEnv } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createChannelSubscriptions, deleteAllForBroadcaster } from "@/lib/twitch/helix";

const back = (q: string) => NextResponse.redirect(`${APP_URL}/dashboard?${q}`);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const jar = await cookies();
  const expected = jar.get("twitch_oauth_state")?.value;
  jar.delete("twitch_oauth_state");
  if (!code || !expected || expected !== state) return back("bot=error_state");

  const viewer = await getViewer();
  if (!viewer) return back("bot=error_login");
  const env = serverEnv();

  // exchange the code just to prove the grant and learn which Twitch user granted it
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.twitchClientId,
      client_secret: env.twitchClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${APP_URL}/api/twitch/callback`,
    }),
  });
  if (!tokenRes.ok) return back("bot=error_token");
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const validate = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { authorization: `OAuth ${access_token}` } });
  const info = (await validate.json()) as { user_id: string; login: string };
  // we don't keep the user token around
  await fetch(`https://id.twitch.tv/oauth2/revoke?client_id=${env.twitchClientId}&token=${access_token}`, { method: "POST" }).catch(() => {});

  if (state.startsWith("bot.")) {
    if (env.botUserId && info.user_id !== env.botUserId) return back("bot=error_wrong_bot_account");
    return back("bot=bot_account_ok");
  }

  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id, twitch_id").eq("owner_id", viewer.id).maybeSingle();
  if (!channel || channel.twitch_id !== info.user_id) return back("bot=error_wrong_account");

  try {
    await deleteAllForBroadcaster(info.user_id);
    const ids = await createChannelSubscriptions(info.user_id);
    await admin.from("channel_secrets").update({ eventsub_subscription_ids: ids }).eq("channel_id", channel.id);
    await admin.from("channels").update({ bot_enabled: true }).eq("id", channel.id);
  } catch (e) {
    console.error(e);
    return back(`bot=error_eventsub&detail=${encodeURIComponent((e as Error).message.slice(0, 200))}`);
  }
  return back("bot=connected");
}
