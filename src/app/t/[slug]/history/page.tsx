import { loadChannelContext } from "@/lib/channel";
import { HistoryView } from "./history-view";

const PAGE_SIZE = 25;

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { channel, supabase } = await loadChannelContext((await params).slug);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const validDate = (v?: string) => (v && !Number.isNaN(Date.parse(v)) ? v : undefined);
  const after = validDate(sp.after);
  const before = validDate(sp.before);

  let q = supabase.from("play_history").select("*", { count: "exact" }).eq("channel_id", channel.id);
  if (after) q = q.gte("played_at", new Date(after).toISOString());
  if (before) q = q.lte("played_at", new Date(before).toISOString());
  const { data, count } = await q.order("played_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <HistoryView
      entries={data ?? []}
      total={count ?? 0}
      page={page}
      pages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
      after={after ?? ""}
      before={before ?? ""}
    />
  );
}
