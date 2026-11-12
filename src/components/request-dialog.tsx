"use client";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button, Field, Textarea } from "@/components/ui";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { useToast } from "@/components/toast";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { QueueSong } from "@/lib/types";

export function RequestDialog({ song, onClose }: { song: QueueSong | null; onClose: () => void }) {
  const { channel, viewer, refresh } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/channels/${channel.slug}/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ songId: song.id, note: note || undefined }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; position?: number; limit?: number };
      if (data.ok) {
        toast(t("request.success", { position: data.position ?? "?" }), "success");
        setNote("");
        onClose();
        await refresh();
      } else {
        const key = `error.${data.error}` as MessageKey;
        toast(t(key, { limit: data.limit ?? "" }) === key ? t("common.error") : t(key, { limit: data.limit ?? "" }), "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!song} onClose={onClose} title={song ? t("request.title", { title: song.title }) : ""}>
      {song && (
        <form onSubmit={submit} className="space-y-4" data-testid="request-form">
          <p className="text-sm text-muted">{song.artist}</p>
          {!viewer && <p className="rounded-md bg-surface-2 p-3 text-xs text-muted">{t("request.loginHint")}</p>}
          <Field label={`${t("request.note")} (${t("common.optional")})`}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} name="note" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" variant="primary" disabled={busy} data-testid="request-submit">{t("request.send")}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
