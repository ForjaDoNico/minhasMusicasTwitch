"use client";
import { RotateCcw, Trash2 } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Button, Card, EmptyState, PageHeader, SourceBadge } from "@/components/ui";
import { LocalTime } from "@/components/local-time";

export default function SavedPage() {
  const { saved, isManager, rpc } = useChannelLive();
  const t = useT();
  return (
    <div>
      <PageHeader title={t("saved.title")} subtitle={t("saved.description")} />
      {saved.length === 0 ? (
        <EmptyState>{t("saved.empty")}</EmptyState>
      ) : (
        <Card>
          <ul data-testid="saved-list">
            {saved.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.song?.title}</span>
                  <span className="block truncate text-sm text-muted">{item.song?.artist}</span>
                </span>
                <span className="flex items-center gap-2 text-sm">
                  {item.requester_name}
                  <SourceBadge source={item.source} label={t(`source.${item.source}`)} />
                </span>
                {item.note && <span className="text-sm italic text-muted">“{item.note}”</span>}
                <span className="text-xs text-muted"><LocalTime value={item.created_at} /></span>
                {isManager && (
                  <span className="flex gap-1">
                    <Button size="sm" onClick={() => rpc("restore_saved", { p_item_id: item.id })}>
                      <RotateCcw className="size-3.5" /> {t("saved.restore")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => rpc("remove_item", { p_item_id: item.id })} aria-label={t("queue.remove")}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
