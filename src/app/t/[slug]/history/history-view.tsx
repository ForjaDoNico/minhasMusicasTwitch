"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Button, Card, EmptyState, Input, Label, PageHeader, SourceBadge } from "@/components/ui";
import { LocalTime } from "@/components/local-time";
import type { PlayHistory } from "@/lib/types";

export function HistoryView({ entries, total, page, pages, after, before }: { entries: PlayHistory[]; total: number; page: number; pages: number; after: string; before: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { version } = useChannelLive();
  const first = useRef(true);

  // new plays arrive through realtime → re-render server data
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    router.refresh();
  }, [version, router]);

  const go = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ after, before, page: String(page), ...params });
    for (const [k, v] of [...sp.entries()]) if (!v || (k === "page" && v === "1")) sp.delete(k);
    router.push(`${pathname}${sp.size ? `?${sp}` : ""}`);
  };

  return (
    <div>
      <PageHeader title={t("history.title")} subtitle={t("history.entries", { count: total })} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="after">{t("history.after")}</Label>
          <Input id="after" type="datetime-local" value={after} onChange={(e) => go({ after: e.target.value, page: "1" })} />
        </div>
        <div>
          <Label htmlFor="before">{t("history.before")}</Label>
          <Input id="before" type="datetime-local" value={before} onChange={(e) => go({ before: e.target.value, page: "1" })} />
        </div>
        {(after || before) && <Button onClick={() => router.push(pathname)}>{t("history.clearFilters")}</Button>}
      </div>
      {entries.length === 0 ? (
        <EmptyState>{t("history.empty")}</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="history-table">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{t("history.colSong")}</th>
                <th className="px-3 py-2">{t("history.colRequester")}</th>
                <th className="px-3 py-2">{t("history.colPlayedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{h.song_title}</div>
                    <div className="text-xs text-muted">{h.song_artist}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {h.source && <SourceBadge source={h.source} label={t(`source.${h.source}`)} />}
                      {h.requester_name ?? t("common.anonymous")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted"><LocalTime value={h.played_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button size="sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>{t("common.previous")}</Button>
          <span className="text-muted">{t("common.page", { page, pages })}</span>
          <Button size="sm" disabled={page >= pages} onClick={() => go({ page: String(page + 1) })}>{t("common.nextPage")}</Button>
        </div>
      )}
    </div>
  );
}
