"use client";
import { useMemo, useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { ArrowUpToLine, Bookmark, GripVertical, Play, Plus, Trash2, Zap } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Badge, Button, Card, EmptyState, PageHeader, SourceBadge } from "@/components/ui";
import { arrayMove, renumber } from "@/lib/queue";
import { LocalTime } from "@/components/local-time";
import type { QueueEntry } from "@/lib/types";
import { QueueControls, QueueControlsCompact } from "./queue-controls";
import { SongPicker } from "./song-picker";

const GRID_MANAGER = "md:grid-cols-[2rem_2.5rem_minmax(0,2.5fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_4rem_8.5rem]";
const GRID_VIEWER = "md:grid-cols-[0_2.5rem_minmax(0,2.5fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_4rem_0]";

export function QueueView() {
  const { channel, nowPlaying, queue, isManager, viewer, settings, rpc, setItems } = useChannelLive();
  const t = useT();
  const [picker, setPicker] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const mine = useMemo(
    () => (viewer ? queue.filter((i) => i.requester_id === viewer.id || (viewer.twitchId && i.requester_twitch_id === viewer.twitchId)) : []),
    [queue, viewer],
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = queue.findIndex((i) => i.id === active.id);
    const to = queue.findIndex((i) => i.id === over.id);
    const reordered = renumber(arrayMove(queue, from, to));
    // optimistic update
    setItems((all) => [...all.filter((i) => i.status !== "QUEUED"), ...reordered]);
    await rpc("reorder_queue", { p_channel_id: channel.id, p_item_ids: reordered.map((i) => i.id) });
  };

  const rules = [
    settings.maxRequestsPerUser > 0 && t("queue.rule.max", { n: settings.maxRequestsPerUser }),
    settings.preventDuplicates && t("queue.rule.noDup"),
    settings.songCooldownHours > 0 && t("queue.rule.cooldown", { h: settings.songCooldownHours }),
    settings.subscribersOnly && t("queue.rule.subs"),
    settings.vipsOnly && t("queue.rule.vips"),
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t("queue.title")}
            <Badge tone={channel.queue_open ? "success" : "neutral"}>{channel.queue_open ? t("queue.open") : t("queue.closed")}</Badge>
          </span>
        }
        subtitle={rules.length ? `${t("queue.rules")}: ${rules.join(" · ")}` : undefined}
        actions={
          <>
            {(channel.queue_open || isManager) && (
              <Button variant={isManager ? "secondary" : "primary"} onClick={() => setPicker(true)} data-testid="open-song-picker">
                <Plus className="size-4" /> {t("queue.addRequest")}
              </Button>
            )}
            {isManager && <QueueControls />}
          </>
        }
      />

      {mine.length > 0 && (
        <p className="mb-4 text-sm text-accent" data-testid="my-positions">
          {t("queue.yourRequests", { positions: mine.map((i) => `#${i.position}`).join(", ") })}
        </p>
      )}

      <Card className="mb-6 border-accent/40 p-5" data-testid="now-playing">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">{t("queue.nowPlaying")}</div>
        {nowPlaying?.song ? (
          <div className="mt-2">
            <div className="text-2xl font-bold" data-testid="now-playing-title">{nowPlaying.song.title}</div>
            <div className="text-muted">{nowPlaying.song.artist}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{t("queue.requestedBy")}</span>
              <span className="font-medium">{nowPlaying.requester_name}</span>
              <SourceBadge source={nowPlaying.source} label={t(`source.${nowPlaying.source}`)} />
            </div>
            {nowPlaying.note && <p className="mt-2 rounded-md bg-surface-2 p-2 text-sm italic">“{nowPlaying.note}”</p>}
          </div>
        ) : (
          <p className="mt-2 text-muted" data-testid="now-playing-empty">{t("queue.nothingPlaying")}</p>
        )}
        {isManager && <QueueControlsCompact />}
      </Card>

      {queue.length === 0 ? (
        <EmptyState>{t("queue.empty")}</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className={clsx("hidden gap-3 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid", isManager ? GRID_MANAGER : GRID_VIEWER)}>
            <span />
            <span>{t("queue.colPosition")}</span>
            <span>{t("queue.colSong")}</span>
            <span>{t("queue.colRequester")}</span>
            <span>{t("queue.colNote")}</span>
            <span>{t("queue.colTime")}</span>
            <span />
          </div>
          <DndContext id="queue-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={queue.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul data-testid="queue-list">
                {queue.map((item) => (
                  <QueueRow key={item.id} item={item} highlight={mine.includes(item)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </Card>
      )}

      <SongPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}

function QueueRow({ item, highlight }: { item: QueueEntry; highlight: boolean }) {
  const { isManager, rpc } = useChannelLive();
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !isManager });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      data-testid="queue-item"
      className={clsx(
        "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-0",
        isManager ? GRID_MANAGER : GRID_VIEWER,
        isDragging && "relative z-10 bg-surface-2 shadow-lg",
        highlight && "bg-accent/5",
      )}
    >
      {isManager ? (
        <button {...attributes} {...listeners} className="hidden cursor-grab touch-none text-muted hover:text-fg md:block" aria-label={t("queue.dragHint")} title={t("queue.dragHint")}>
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="hidden md:block" />
      )}
      <span className="text-sm font-bold text-muted">
        {item.position}
        {item.is_priority && <Zap className="ml-0.5 inline size-3 text-warning" aria-label={t("queue.priority")} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{item.song?.title}</span>
        <span className="block truncate text-sm text-muted">{item.song?.artist}</span>
      </span>
      <span className="col-start-2 flex min-w-0 items-center gap-2 text-sm md:col-start-auto">
        <span className="truncate">{item.requester_name}</span>
        <SourceBadge source={item.source} label={t(`source.${item.source}`)} />
      </span>
      <span className="col-start-2 truncate text-sm italic text-muted md:col-start-auto" title={item.note ?? ""}>{item.note}</span>
      <span className="hidden text-xs text-muted md:block"><LocalTime value={item.created_at} mode="time" /></span>
      <span className="col-start-3 row-span-2 row-start-1 flex items-center justify-end gap-0.5 md:col-start-auto md:row-span-1 md:row-start-auto">
        {isManager && (
          <>
            <IconBtn label={t("queue.play")} onClick={() => rpc("play_item", { p_item_id: item.id })} testId="play-item"><Play className="size-4" /></IconBtn>
            <IconBtn label={t("queue.moveTop")} onClick={() => rpc("move_to_top", { p_item_id: item.id })}><ArrowUpToLine className="size-4" /></IconBtn>
            <IconBtn label={t("queue.saveLater")} onClick={() => rpc("save_item", { p_item_id: item.id })}><Bookmark className="size-4" /></IconBtn>
            <IconBtn label={t("queue.remove")} onClick={() => rpc("remove_item", { p_item_id: item.id })} danger><Trash2 className="size-4" /></IconBtn>
          </>
        )}
      </span>
    </li>
  );
}

function IconBtn({ label, onClick, children, danger, testId }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; testId?: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} data-testid={testId}
      className={clsx("rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2", danger ? "hover:text-danger" : "hover:text-fg")}>
      {children}
    </button>
  );
}
