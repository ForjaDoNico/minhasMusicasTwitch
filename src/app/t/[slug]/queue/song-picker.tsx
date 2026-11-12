"use client";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Badge, Button, Input } from "@/components/ui";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { rankSongs } from "@/lib/fuzzy";
import { RequestDialog } from "@/components/request-dialog";
import type { QueueSong } from "@/lib/types";

/** Search the songlist (fuzzy) and pick a song to request. */
export function SongPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { channel } = useChannelLive();
  const t = useT();
  const [songs, setSongs] = useState<QueueSong[] | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<QueueSong | null>(null);

  useEffect(() => {
    if (!open || songs) return;
    void supabaseBrowser()
      .from("songs")
      .select("id, title, artist, tags, is_premium")
      .eq("channel_id", channel.id)
      .order("title")
      .then(({ data }) => setSongs(data ?? []));
  }, [open, songs, channel.id]);

  const results = useMemo(() => {
    if (!songs) return [];
    return q.trim() ? rankSongs(q, songs, 20).map((r) => r.item) : songs.slice(0, 20);
  }, [q, songs]);

  return (
    <>
      <Dialog open={open && !selected} onClose={onClose} title={t("queue.addRequest")} wide>
        <Input autoFocus placeholder={t("songs.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} data-testid="picker-search" />
        <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto">
          {songs === null && <li className="p-3 text-sm text-muted">{t("common.loading")}</li>}
          {results.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.title}</span>
                <span className="block truncate text-sm text-muted">{s.artist}</span>
              </span>
              {s.is_premium && <Badge tone="warning">{t("songs.premium")}</Badge>}
              <Button size="sm" variant="primary" onClick={() => setSelected(s)} data-testid="picker-request">{t("songs.request")}</Button>
            </li>
          ))}
        </ul>
      </Dialog>
      <RequestDialog song={selected} onClose={() => { setSelected(null); onClose(); }} />
    </>
  );
}
