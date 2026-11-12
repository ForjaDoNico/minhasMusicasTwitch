import { loadChannelContext } from "@/lib/channel";
import { HomeView } from "./home-view";
import type { ChannelStats } from "@/lib/types";

export default async function ChannelHome({ params }: { params: Promise<{ slug: string }> }) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const { data } = await supabase.rpc("channel_stats", { p_channel_id: channel.id });
  return <HomeView initialStats={data as unknown as ChannelStats} />;
}
