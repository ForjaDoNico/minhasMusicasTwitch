import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";

/** Creates the streamer's channel from their verified Twitch profile (slug = Twitch login). */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) redirect("/dashboard");
  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("channels").select("id").eq("owner_id", viewer.id).maybeSingle();
  if (!existing) {
    const { data: profile } = await admin.from("profiles").select("*").eq("id", viewer.id).single();
    const { data: settings } = await admin.rpc("default_channel_settings");
    const { error } = await admin.from("channels").insert({
      owner_id: viewer.id,
      twitch_id: profile?.twitch_id ?? null,
      slug: viewer.login,
      display_name: viewer.displayName,
      avatar_url: viewer.avatarUrl,
      settings: settings ?? {},
    });
    if (error) {
      console.error("create channel", error);
      redirect("/dashboard?error=create_failed");
    }
  }
  redirect("/dashboard");
}
