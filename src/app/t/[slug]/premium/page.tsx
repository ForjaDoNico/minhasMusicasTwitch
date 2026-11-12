import { loadChannelContext } from "@/lib/channel";
import { SongsView } from "../songs/songs-view";
import { PremiumHeader } from "./premium-header";

export default async function PremiumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const { data: songs } = await supabase.from("songs").select("*").eq("channel_id", channel.id).eq("is_premium", true).order("title");
  return (
    <>
      <PremiumHeader />
      <SongsView premiumOnly initialSongs={songs ?? []} initialQuery={{ q: "", orderBy: "title", orderDir: "asc", tag: "" }} />
    </>
  );
}
