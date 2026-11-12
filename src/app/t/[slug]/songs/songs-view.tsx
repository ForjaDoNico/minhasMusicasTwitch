"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Columns3, Filter, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useLocale, useT } from "@/lib/i18n/client";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { formatElapsed } from "@/lib/relative-time";
import { rankSongs } from "@/lib/fuzzy";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RequestDialog } from "@/components/request-dialog";
import type { Song } from "@/lib/types";
import { SongFormDialog, ImportDialog } from "./song-forms";
import { SongDetailsDialog } from "./song-details";
import { ConfirmButton } from "@/components/confirm-button";
import { useToast } from "@/components/toast";

export interface SongsQuery {
  q: string;
  orderBy: "lastPlayed" | "timesPlayed" | "title" | "artist";
  orderDir: "asc" | "desc";
  tag: string;
}

type ColumnKey = "artist" | "tags" | "lastPlayed" | "timesPlayed";
const ALL_COLUMNS: ColumnKey[] = ["artist", "tags", "lastPlayed", "timesPlayed"];
export const NEW_TAG = "__new";
export const PREMIUM_TAG = "__premium";

export function SongsView({ initialSongs, initialQuery, premiumOnly }: { initialSongs: Song[]; initialQuery: SongsQuery; premiumOnly?: boolean }) {
  const { channel, isOwner } = useChannelLive();
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [songs, setSongs] = useState(initialSongs);
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(initialQuery.orderBy !== "title" || !!initialQuery.tag);
  const [columns, setColumns] = useState<ColumnKey[]>(ALL_COLUMNS);
  const [showColumns, setShowColumns] = useState(false);
  const [requesting, setRequesting] = useState<Song | null>(null);
  const [details, setDetails] = useState<Song | null>(null);
  const [editing, setEditing] = useState<Song | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("songs-columns");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted column choice after hydration
    if (saved) setColumns(JSON.parse(saved) as ColumnKey[]);
  }, []);

  // reflect filters in the URL (?order_by=lastPlayed&order_dir=asc&tag=…&q=…)
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string, def: string) => (v && v !== def ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set("q", query.q, "");
    set("order_by", query.orderBy, "title");
    set("order_dir", query.orderDir, query.orderBy === "title" ? "asc" : "");
    if (query.orderBy !== "title") url.searchParams.set("order_dir", query.orderDir);
    set("tag", query.tag, "");
    window.history.replaceState(null, "", url);
  }, [query]);

  const reload = useCallback(async () => {
    const { data } = await supabaseBrowser().from("songs").select("*").eq("channel_id", channel.id).order("title").limit(5000);
    if (data) setSongs(data);
  }, [channel.id]);

  const tags = useMemo(() => [...new Set(songs.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b)), [songs]);

  const visible = useMemo(() => {
    let list = premiumOnly ? songs.filter((s) => s.is_premium) : songs;
    if (query.tag === NEW_TAG) list = list.filter((s) => s.is_new);
    else if (query.tag === PREMIUM_TAG) list = list.filter((s) => s.is_premium);
    else if (query.tag) list = list.filter((s) => s.tags.includes(query.tag));
    if (query.q.trim()) {
      // fuzzy search keeps relevance order unless the user picked another ordering
      const ranked = rankSongs(query.q, list, 500).map((r) => r.item);
      if (query.orderBy === "title" && query.orderDir === "asc") return ranked;
      list = ranked;
    }
    const dir = query.orderDir === "asc" ? 1 : -1;
    const cmp: Record<SongsQuery["orderBy"], (a: Song, b: Song) => number> = {
      title: (a, b) => a.title.localeCompare(b.title, locale),
      artist: (a, b) => a.artist.localeCompare(b.artist, locale) || a.title.localeCompare(b.title, locale),
      timesPlayed: (a, b) => a.times_played - b.times_played,
      lastPlayed: (a, b) => (a.last_played_at ? Date.parse(a.last_played_at) : 0) - (b.last_played_at ? Date.parse(b.last_played_at) : 0),
    };
    return [...list].sort((a, b) => cmp[query.orderBy](a, b) * dir);
  }, [songs, query, locale, premiumOnly]);

  const toggleColumn = (c: ColumnKey) => {
    const next = columns.includes(c) ? columns.filter((x) => x !== c) : ALL_COLUMNS.filter((x) => x === c || columns.includes(x));
    setColumns(next);
    localStorage.setItem("songs-columns", JSON.stringify(next));
  };

  const sortBy = (orderBy: SongsQuery["orderBy"]) =>
    setQuery((q) => ({ ...q, orderBy, orderDir: q.orderBy === orderBy && q.orderDir === "asc" ? "desc" : "asc" }));

  const columnLabel: Record<ColumnKey, string> = {
    artist: t("songs.colArtist"),
    tags: t("songs.colTags"),
    lastPlayed: t("songs.colLastPlayed"),
    timesPlayed: t("songs.colTimesPlayed"),
  };

  const sortHead = (k: SongsQuery["orderBy"], label: string, className?: string) => (
    <th key={k} className={clsx("px-3 py-2 text-left font-semibold", className)}>
      <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 hover:text-fg">
        {label}
        {query.orderBy === k && (query.orderDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  const remove = async (s: Song) => {
    const { error } = await supabaseBrowser().from("songs").delete().eq("id", s.id);
    if (error) toast(error.message, "error");
    else setSongs((all) => all.filter((x) => x.id !== s.id));
  };

  return (
    <div>
      <PageHeader
        title={premiumOnly ? t("premium.title") : t("songs.title")}
        actions={
          isOwner && !premiumOnly ? (
            <>
              <Button onClick={() => setImporting(true)}><Upload className="size-4" /> {t("songs.import")}</Button>
              <Button variant="primary" onClick={() => setEditing("new")} data-testid="add-song"><Plus className="size-4" /> {t("songs.add")}</Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder={t("songs.searchPlaceholder")}
          value={query.q}
          onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value }))}
          data-testid="songs-search"
          aria-label={t("common.search")}
        />
        <Button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          <Filter className="size-4" /> {showFilters ? t("songs.lessFilters") : t("songs.moreFilters")}
        </Button>
        <div className="relative">
          <Button onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns}>
            <Columns3 className="size-4" /> {t("songs.columns")}
          </Button>
          {showColumns && (
            <div className="absolute left-0 top-10 z-20 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
              {ALL_COLUMNS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input type="checkbox" checked={columns.includes(c)} onChange={() => toggleColumn(c)} className="accent-[var(--accent)]" />
                  {columnLabel[c]}
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="ml-auto text-sm text-muted" data-testid="songs-count">{t("songs.count", { count: visible.length })}</span>
      </div>

      {showFilters && (
        <Card className="mb-3 grid gap-3 p-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            {t("songs.orderBy")}
            <Select value={query.orderBy} onChange={(e) => setQuery((q) => ({ ...q, orderBy: e.target.value as SongsQuery["orderBy"] }))} className="mt-1">
              <option value="lastPlayed">{t("songs.colLastPlayed")}</option>
              <option value="timesPlayed">{t("songs.colTimesPlayed")}</option>
              <option value="title">{t("songs.colTitle")}</option>
              <option value="artist">{t("songs.colArtist")}</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            {t("songs.direction")}
            <Select value={query.orderDir} onChange={(e) => setQuery((q) => ({ ...q, orderDir: e.target.value as "asc" | "desc" }))} className="mt-1">
              <option value="asc">{t("songs.asc")}</option>
              <option value="desc">{t("songs.desc")}</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            {t("songs.tag")}
            <Select value={query.tag} onChange={(e) => setQuery((q) => ({ ...q, tag: e.target.value }))} className="mt-1" data-testid="tag-filter">
              <option value="">{t("common.all")}</option>
              <option value={NEW_TAG}>{t("songs.new")}</option>
              {!premiumOnly && <option value={PREMIUM_TAG}>{t("songs.premium")}</option>}
              {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </Select>
          </label>
        </Card>
      )}

      {query.tag && (
        <div className="mb-3">
          <button onClick={() => setQuery((q) => ({ ...q, tag: "" }))}>
            <Badge tone="accent">{query.tag === NEW_TAG ? t("songs.new") : query.tag === PREMIUM_TAG ? t("songs.premium") : query.tag} ✕</Badge>
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState>{t("songs.empty")}</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="songs-table">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                {sortHead("title", t("songs.colTitle"))}
                {columns.includes("artist") && sortHead("artist", t("songs.colArtist"))}
                {columns.includes("tags") && <th className="px-3 py-2 text-left font-semibold">{t("songs.colTags")}</th>}
                {columns.includes("lastPlayed") && sortHead("lastPlayed", t("songs.colLastPlayed"))}
                {columns.includes("timesPlayed") && sortHead("timesPlayed", t("songs.colTimesPlayed"), "text-right")}
                <th className="w-px px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-2/60" data-testid="song-row">
                  <td className="px-3 py-2">
                    <button onClick={() => setDetails(s)} className="text-left font-medium hover:text-accent">{s.title}</button>
                    {!columns.includes("artist") && <div className="text-xs text-muted">{s.artist}</div>}
                  </td>
                  {columns.includes("artist") && <td className="px-3 py-2 text-muted">{s.artist}</td>}
                  {columns.includes("tags") && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {s.is_new && <button onClick={() => setQuery((q) => ({ ...q, tag: NEW_TAG }))}><Badge tone="success">{t("songs.new")}</Badge></button>}
                        {s.is_premium && <button onClick={() => setQuery((q) => ({ ...q, tag: PREMIUM_TAG }))}><Badge tone="warning">{t("songs.premium")}</Badge></button>}
                        {s.tags.map((tag) => (
                          <button key={tag} onClick={() => setQuery((q) => ({ ...q, tag }))}><Badge>{tag}</Badge></button>
                        ))}
                      </div>
                    </td>
                  )}
                  {columns.includes("lastPlayed") && (
                    <td className="whitespace-nowrap px-3 py-2 text-muted" title={s.last_played_at ?? ""} suppressHydrationWarning>{formatElapsed(s.last_played_at, locale)}</td>
                  )}
                  {columns.includes("timesPlayed") && <td className="px-3 py-2 text-right tabular-nums">{s.times_played}</td>}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {channel.queue_open && (
                        <Button size="sm" variant="primary" onClick={() => setRequesting(s)} data-testid="request-song">{t("songs.request")}</Button>
                      )}
                      {isOwner && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={t("common.edit")} title={t("common.edit")}><Pencil className="size-3.5" /></Button>
                          <ConfirmButton variant="ghost" message={t("songs.deleteConfirm", { title: s.title })} onConfirm={() => remove(s)} aria-label={t("common.delete")} title={t("common.delete")}>
                            <Trash2 className="size-3.5" />
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <RequestDialog song={requesting} onClose={() => setRequesting(null)} />
      <SongDetailsDialog song={details} onClose={() => setDetails(null)} onRequest={(s) => { setDetails(null); setRequesting(s); }} />
      {isOwner && (
        <>
          <SongFormDialog song={editing} tags={tags} onClose={() => setEditing(null)} onSaved={reload} />
          <ImportDialog open={importing} onClose={() => setImporting(false)} onDone={reload} />
        </>
      )}
    </div>
  );
}
