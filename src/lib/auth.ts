import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

/** Current logged-in user + profile (validated against Supabase Auth). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!p) return null;
  return { id: p.id, login: p.login, displayName: p.display_name, avatarUrl: p.avatar_url, twitchId: p.twitch_id };
});
