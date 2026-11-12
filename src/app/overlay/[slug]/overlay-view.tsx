"use client";
import { useEffect } from "react";
import { Music } from "lucide-react";
import { ChannelLiveProvider, useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import type { Channel, QueueEntry } from "@/lib/types";

/** OBS browser source: transparent background, realtime "now playing" + next requests. */
export function OverlayView({ channel, initialItems, nextCount }: { channel: Channel; initialItems: QueueEntry[]; nextCount: number }) {
  useEffect(() => {
    document.documentElement.classList.add("overlay", "dark");
  }, []);
  return (
    <ChannelLiveProvider initialChannel={channel} initialItems={initialItems} viewer={null} isOwner={false} isManager={false}>
      <Overlay nextCount={nextCount} />
    </ChannelLiveProvider>
  );
}

function Overlay({ nextCount }: { nextCount: number }) {
  const { nowPlaying, queue } = useChannelLive();
  const t = useT();
  const next = queue.slice(0, nextCount);
  const shadow = { textShadow: "0 2px 6px rgba(0,0,0,.85)" };
  return (
    <div className="w-[480px] space-y-3 p-4 text-white" style={shadow}>
      <div className="rounded-xl bg-black/55 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-300">
          <Music className="size-4" /> {t("overlay.nowPlaying")}
        </div>
        {nowPlaying?.song ? (
          <div className="mt-1">
            <div className="truncate text-2xl font-extrabold" data-testid="overlay-now">{nowPlaying.song.title}</div>
            <div className="truncate text-sm text-white/80">{nowPlaying.song.artist} · {nowPlaying.requester_name}</div>
          </div>
        ) : (
          <div className="mt-1 text-lg text-white/70">—</div>
        )}
      </div>
      {next.length > 0 && (
        <div className="rounded-xl bg-black/45 p-3 backdrop-blur-sm">
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-300">{t("overlay.next")}</div>
          <ol className="space-y-1 text-sm">
            {next.map((i) => (
              <li key={i.id} className="flex gap-2 truncate">
                <span className="font-bold text-white/60">{i.position}.</span>
                <span className="truncate">{i.song?.title} <span className="text-white/60">— {i.requester_name}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
