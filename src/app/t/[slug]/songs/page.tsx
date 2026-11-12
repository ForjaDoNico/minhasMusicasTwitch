import { loadChannelContext } from "@/lib/channel";
import { SongsView, type SongsQuery } from "./songs-view";

export default async function SongsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const sp = await searchParams;
  const { data: songs } = await supabase.from("songs").select("*").eq("channel_id", channel.id).order("title").limit(5000);
  const initial: SongsQuery = {
    q: sp.q ?? "",
    orderBy: (["lastPlayed", "timesPlayed", "title", "artist"].includes(sp.order_by ?? "") ? sp.order_by : "title") as SongsQuery["orderBy"],
    orderDir: sp.order_dir === "desc" ? "desc" : "asc",
    tag: sp.tag ?? "",
  };
  return <SongsView initialSongs={songs ?? []} initialQuery={initial} />;
}
