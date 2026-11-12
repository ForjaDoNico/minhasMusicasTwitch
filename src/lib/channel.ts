import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export const getChannelBySlug = cache(async (slug: string) => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("channels").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  return data;
});

/** Channel + viewer roles for a public page. 404 when the channel does not exist. */
export const loadChannelContext = cache(async (slug: string) => {
  const [channel, viewer] = await Promise.all([getChannelBySlug(slug), getViewer()]);
  if (!channel) notFound();
  const supabase = await supabaseServer();
  let isManager = false;
  const isOwner = !!viewer && viewer.id === channel.owner_id;
  if (viewer) {
    const { data } = await supabase.rpc("is_channel_manager", { p_channel_id: channel.id });
    isManager = !!data;
  }
  return { channel, viewer, isOwner, isManager, supabase };
});
