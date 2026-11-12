"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { useToast } from "@/components/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { csvToSongs } from "@/lib/csv";
import type { Song } from "@/lib/types";

export function SongFormDialog({ song, tags, onClose, onSaved }: { song: Song | "new" | null; tags: string[]; onClose: () => void; onSaved: () => void }) {
  const { channel } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", artist: "", tags: "", is_new: true, is_premium: false, notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!song) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form whenever another song is opened
    setForm(
      song === "new"
        ? { title: "", artist: "", tags: "", is_new: true, is_premium: false, notes: "" }
        : { title: song.title, artist: song.artist, tags: song.tags.join(", "), is_new: song.is_new, is_premium: song.is_premium, notes: song.notes ?? "" },
    );
  }, [song]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      artist: form.artist.trim(),
      tags: [...new Set(form.tags.split(",").map((x) => x.trim()).filter(Boolean))],
      is_new: form.is_new,
      is_premium: form.is_premium,
      notes: form.notes.trim() || null,
    };
    const supabase = supabaseBrowser();
    const { error } =
      song === "new"
        ? await supabase.from("songs").insert({ ...payload, channel_id: channel.id })
        : await supabase.from("songs").update(payload).eq("id", (song as Song).id);
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast(t("common.saved"), "success");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!song} onClose={onClose} title={song === "new" ? t("songs.newSong") : t("songs.editSong")}>
      <form onSubmit={submit} className="space-y-3" data-testid="song-form">
        <Field label={t("songs.colTitle")}>
          <Input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} name="title" autoFocus />
        </Field>
        <Field label={t("songs.colArtist")}>
          <Input maxLength={200} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} name="artist" />
        </Field>
        <Field label={t("songs.colTags")} hint={t("songs.tagsHelp")}>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} list="song-tags" name="tags" />
          <datalist id="song-tags">{tags.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <Field label={t("songs.notes")}>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Checkbox label={t("songs.isNew")} checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} />
        <Checkbox label={t("songs.isPremium")} checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} />
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={busy}>{t("common.save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { channel } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const { songs, skipped } = csvToSongs(await file.text());
      const supabase = supabaseBrowser();
      for (let i = 0; i < songs.length; i += 500) {
        const { error } = await supabase.from("songs").insert(songs.slice(i, i + 500).map((s) => ({ ...s, channel_id: channel.id })));
        if (error) throw error;
      }
      toast(t("songs.imported", { count: songs.length, skipped }), "success");
      onDone();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("songs.import")}>
      <p className="mb-4 text-sm text-muted">{t("songs.importHelp")}</p>
      <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg" />
    </Dialog>
  );
}
