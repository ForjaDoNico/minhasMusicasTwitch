"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Badge, Button } from "@/components/ui";
import { useChannelLive } from "@/components/channel-live";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/format";
import { formatElapsed } from "@/lib/relative-time";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import type { Song } from "@/lib/types";

export function SongDetailsDialog({ song, onClose, onRequest }: { song: Song | null; onClose: () => void; onRequest: (s: Song) => void }) {
  const { channel, viewer } = useChannelLive();
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [favs, setFavs] = useState<{ twitch_id: string; display_name: string }[]>([]);

  useEffect(() => {
    if (!song) return;
    void supabaseBrowser().from("favorites").select("twitch_id, display_name").eq("song_id", song.id)
      .then(({ data }) => setFavs(data ?? []));
  }, [song]);

  const isFav = !!viewer?.twitchId && favs.some((f) => f.twitch_id === viewer.twitchId);

  const toggleFav = async () => {
    if (!song) return;
    const res = await fetch(`/api/channels/${channel.slug}/favorite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, favorite: !isFav }),
    });
    if (!res.ok) return toast(t("common.error"), "error");
    setFavs((f) => (isFav ? f.filter((x) => x.twitch_id !== viewer!.twitchId) : [...f, { twitch_id: viewer!.twitchId!, display_name: viewer!.displayName }]));
  };

  return (
    <Dialog open={!!song} onClose={onClose} title={t("songs.details")}>
      {song && (
        <div className="space-y-4">
          <div>
            <div className="text-xl font-bold">{song.title}</div>
            <div className="text-muted">{song.artist}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {song.is_new && <Badge tone="success">{t("songs.new")}</Badge>}
              {song.is_premium && <Badge tone="warning">{t("songs.premium")}</Badge>}
              {song.tags.map((x) => <Badge key={x}>{x}</Badge>)}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">{t("songs.colTimesPlayed")}</dt><dd className="font-semibold">{song.times_played}</dd></div>
            <div><dt className="text-xs text-muted">{t("songs.colLastPlayed")}</dt><dd className="font-semibold">{formatElapsed(song.last_played_at, locale)}</dd></div>
            <div><dt className="text-xs text-muted">{t("songs.addedAt")}</dt><dd>{formatDateTime(song.created_at, locale)}</dd></div>
            <div><dt className="text-xs text-muted">{t("songs.favorites")}</dt><dd>{favs.length}</dd></div>
          </dl>
          {song.notes && <p className="whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-sm">{song.notes}</p>}
          <div className="flex justify-end gap-2">
            {viewer?.twitchId && (
              <Button onClick={toggleFav}>
                <Heart className={isFav ? "size-4 fill-danger text-danger" : "size-4"} /> {isFav ? t("songs.unfavorite") : t("songs.favorite")}
              </Button>
            )}
            {channel.queue_open && <Button variant="primary" onClick={() => onRequest(song)}>{t("songs.request")}</Button>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
