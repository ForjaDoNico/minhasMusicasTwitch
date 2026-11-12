"use client";
import { Lock, LockOpen, Play, SkipForward, CheckCheck, Trash2 } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

export function QueueControls() {
  const { channel, queue, rpc } = useChannelLive();
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={channel.queue_open ? "secondary" : "primary"}
        onClick={() => rpc("set_queue_open", { p_channel_id: channel.id, p_open: !channel.queue_open })}
        data-testid="toggle-queue"
      >
        {channel.queue_open ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
        {channel.queue_open ? t("queue.closeQueue") : t("queue.openQueue")}
      </Button>
      {queue.length > 0 && (
        <ConfirmButton message={t("queue.clearConfirm")} onConfirm={() => rpc("clear_queue", { p_channel_id: channel.id })} size="md">
          <Trash2 className="size-4" /> {t("queue.clear")}
        </ConfirmButton>
      )}
    </div>
  );
}

/** Buttons for the "Tocando agora" card. */
export function QueueControlsCompact() {
  const { channel, nowPlaying, queue, rpc } = useChannelLive();
  const t = useT();
  if (!nowPlaying && queue.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {nowPlaying ? (
        <>
          <Button variant="primary" size="sm" onClick={() => rpc("play_next", { p_channel_id: channel.id, p_record: true })} data-testid="mark-played-next">
            <CheckCheck className="size-4" /> {t("queue.markPlayedNext")}
          </Button>
          <Button size="sm" onClick={() => rpc("finish_current", { p_channel_id: channel.id })} data-testid="mark-played">
            {t("queue.markPlayed")}
          </Button>
          <Button size="sm" onClick={() => rpc("play_next", { p_channel_id: channel.id, p_record: false })} data-testid="skip">
            <SkipForward className="size-4" /> {t("queue.skip")}
          </Button>
        </>
      ) : (
        <Button variant="primary" size="sm" onClick={() => rpc("play_next", { p_channel_id: channel.id, p_record: true })} data-testid="play-first">
          <Play className="size-4" /> {t("queue.playFirst")}
        </Button>
      )}
    </div>
  );
}
