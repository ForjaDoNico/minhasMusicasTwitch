import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteAllForBroadcaster } from "@/lib/twitch/helix";

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id, twitch_id").eq("owner_id", viewer.id).maybeSingle();
  if (!channel) return NextResponse.json({ ok: false }, { status: 404 });
  if (channel.twitch_id) await deleteAllForBroadcaster(channel.twitch_id).catch((e) => console.error(e));
  await admin.from("channel_secrets").update({ eventsub_subscription_ids: [] }).eq("channel_id", channel.id);
  await admin.from("channels").update({ bot_enabled: false }).eq("id", channel.id);
  return NextResponse.redirect(new URL("/dashboard?bot=disconnected", req.url), { status: 303 });
}
