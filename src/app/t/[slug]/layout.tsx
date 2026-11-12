import type { Metadata } from "next";
import { loadChannelContext, getChannelBySlug } from "@/lib/channel";
import { ChannelLiveProvider } from "@/components/channel-live";
import { ChannelShell } from "@/components/sidebar";
import { QUEUE_SELECT, type QueueEntry } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const channel = await getChannelBySlug((await params).slug);
  return { title: channel ? channel.display_name : "Songlist" };
}

export default async function ChannelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { channel, viewer, isOwner, isManager, supabase } = await loadChannelContext(slug);
  const [{ data: items }] = await Promise.all([
    supabase.from("queue_items").select(QUEUE_SELECT).eq("channel_id", channel.id).order("position"),
    // every visit touches the DB: keeps free Supabase projects from being paused
    supabase.rpc("touch_visit", { p_channel_id: channel.id }),
  ]);
  return (
    <ChannelLiveProvider
      key={channel.id}
      initialChannel={channel}
      initialItems={(items ?? []) as QueueEntry[]}
      viewer={viewer}
      isOwner={isOwner}
      isManager={isManager}
    >
      <ChannelShell>{children}</ChannelShell>
    </ChannelLiveProvider>
  );
}
