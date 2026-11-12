"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { channelSettings, QUEUE_SELECT, type Channel, type ChannelSettings, type QueueEntry, type Viewer } from "@/lib/types";
import { sortQueue } from "@/lib/queue";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export type RealtimeStatus = "connecting" | "live" | "reconnecting";

interface ChannelLiveValue {
  channel: Channel;
  settings: ChannelSettings;
  viewer: Viewer | null;
  isOwner: boolean;
  isManager: boolean;
  items: QueueEntry[];
  nowPlaying: QueueEntry | null;
  queue: QueueEntry[];
  saved: QueueEntry[];
  status: RealtimeStatus;
  /** increments on every server-side change of the channel (queue, history, session…) */
  version: number;
  refresh: () => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<QueueEntry[]>>;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<boolean>;
}

const Ctx = createContext<ChannelLiveValue | null>(null);

export function useChannelLive() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChannelLive outside ChannelLiveProvider");
  return v;
}

export function ChannelLiveProvider({
  initialChannel,
  initialItems,
  viewer,
  isOwner,
  isManager,
  children,
}: {
  initialChannel: Channel;
  initialItems: QueueEntry[];
  viewer: Viewer | null;
  isOwner: boolean;
  isManager: boolean;
  children: React.ReactNode;
}) {
  const [channel, setChannel] = useState(initialChannel);
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [version, setVersion] = useState(0);
  const toast = useToast();
  const t = useT();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelId = initialChannel.id;

  const refresh = useCallback(async () => {
    const supabase = supabaseBrowser();
    const [{ data: q }, { data: c }] = await Promise.all([
      supabase.from("queue_items").select(QUEUE_SELECT).eq("channel_id", channelId).order("position"),
      supabase.from("channels").select("*").eq("id", channelId).single(),
    ]);
    if (q) setItems(q as QueueEntry[]);
    if (c) setChannel(c);
    setVersion((v) => v + 1);
  }, [channelId]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let wasLive = false;
    const sub = supabase
      .channel(`queue:${channelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "channels", filter: `id=eq.${channelId}` },
        (payload) => {
          setChannel((prev) => ({ ...prev, ...(payload.new as Channel) }));
          // debounce bursts of updates into a single refetch
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void refresh(), 120);
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          if (wasLive) void refresh(); // catch up on anything missed while disconnected
          wasLive = true;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("reconnecting");
        }
      });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(sub);
    };
  }, [channelId, refresh]);

  const rpc = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      const supabase = supabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic RPC name
      const { data, error } = await (supabase.rpc as any)(fn, args);
      const result = data as { ok?: boolean; error?: string } | null;
      if (error || (result && result.ok === false)) {
        const code = error?.message?.includes("not_allowed") ? "not_allowed" : (result?.error ?? "");
        const key = `error.${code}` as MessageKey;
        toast(code && t(key) !== key ? t(key) : (error?.message ?? t("common.error")), "error");
        return false;
      }
      await refresh();
      return true;
    },
    [refresh, toast, t],
  );

  const value = useMemo<ChannelLiveValue>(() => {
    const sorted = sortQueue(items);
    return {
      channel,
      settings: channelSettings(channel),
      viewer,
      isOwner,
      isManager,
      items,
      nowPlaying: items.find((i) => i.status === "PLAYING") ?? null,
      queue: sorted.filter((i) => i.status === "QUEUED"),
      saved: items.filter((i) => i.status === "SAVED").sort((a, b) => a.created_at.localeCompare(b.created_at)),
      status,
      version,
      refresh,
      setItems,
      rpc,
    };
  }, [channel, items, status, version, viewer, isOwner, isManager, refresh, rpc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RealtimeIndicator() {
  const { status } = useChannelLive();
  const t = useT();
  const live = status === "live";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" data-testid="realtime-status" data-status={status}>
      <span className={`size-2 rounded-full ${live ? "bg-success" : "animate-pulse bg-warning"}`} />
      {live ? t("realtime.live") : t("realtime.reconnecting")}
    </span>
  );
}
