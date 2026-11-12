import { loadChannelContext } from "@/lib/channel";
import { CommandsView } from "./commands-view";

export default async function CommandsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const { data } = await supabase.from("bot_commands").select("*").eq("channel_id", channel.id).order("is_default", { ascending: false }).order("created_at");
  return <CommandsView initial={data ?? []} />;
}
