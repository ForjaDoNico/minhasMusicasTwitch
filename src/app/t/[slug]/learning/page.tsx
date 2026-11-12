import { loadChannelContext } from "@/lib/channel";
import { LearningView } from "./learning-view";

export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const { data } = await supabase.from("learning_requests").select("*").eq("channel_id", channel.id)
    .order("status").order("votes", { ascending: false }).order("created_at").limit(500);
  return <LearningView initial={data ?? []} />;
}
