import { notFound } from "next/navigation";
import { getChannelBySlug } from "@/lib/channel";
import { supabaseServer } from "@/lib/supabase/server";
import { QUEUE_SELECT, type QueueEntry } from "@/lib/types";
import { OverlayView } from "./overlay-view";

export default async function OverlayPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ next?: string }> }) {
  const channel = await getChannelBySlug((await params).slug);
  if (!channel) notFound();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("queue_items").select(QUEUE_SELECT).eq("channel_id", channel.id).order("position");
  const nextCount = Math.min(10, Math.max(0, Number((await searchParams).next ?? 3) || 0));
  return <OverlayView channel={channel} initialItems={(data ?? []) as QueueEntry[]} nextCount={nextCount} />;
}
