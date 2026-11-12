"use client";
import { useState } from "react";
import { Check, Plus, ThumbsUp, Trash2, X } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { LearningRequest } from "@/lib/types";

export function LearningView({ initial }: { initial: LearningRequest[] }) {
  const { channel, isOwner } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "" });

  const reload = async () => {
    const { data } = await supabaseBrowser().from("learning_requests").select("*").eq("channel_id", channel.id)
      .order("status").order("votes", { ascending: false }).order("created_at").limit(500);
    if (data) setItems(data);
  };

  const call = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/channels/${channel.slug}/learning`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; voted?: boolean; error?: string };
    if (!data.ok) toast(data.error === "rate_limited" ? t("error.rate_limited") : t("common.error"), "error");
    else if (body.action === "vote") toast(t("learning.voted"), "success");
    await reload();
    return data.ok;
  };

  const ownerAction = async (id: string, action: "learn" | "reject" | "delete") => {
    const supabase = supabaseBrowser();
    const { error } =
      action === "learn"
        ? await supabase.rpc("learn_song", { p_request_id: id })
        : action === "reject"
          ? await supabase.from("learning_requests").update({ status: "REJECTED" }).eq("id", id)
          : await supabase.from("learning_requests").delete().eq("id", id);
    if (error) toast(error.message, "error");
    await reload();
  };

  return (
    <div>
      <PageHeader
        title={t("learning.title")}
        subtitle={t("learning.description")}
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> {t("learning.suggest")}</Button>}
      />
      {items.length === 0 ? (
        <EmptyState>{t("learning.empty")}</EmptyState>
      ) : (
        <Card>
          <ul>
            {items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="w-20 shrink-0 text-center text-sm font-semibold text-accent">{t("learning.votes", { count: r.votes })}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-sm text-muted">{r.artist} · {t("learning.suggestedBy", { name: r.requested_by })}</span>
                </span>
                <Badge tone={r.status === "OPEN" ? "accent" : r.status === "LEARNED" ? "success" : "neutral"}>{t(`learning.status.${r.status}`)}</Badge>
                {r.status === "OPEN" && (
                  <Button size="sm" onClick={() => call({ action: "vote", id: r.id })}><ThumbsUp className="size-3.5" /> {t("learning.vote")}</Button>
                )}
                {isOwner && r.status === "OPEN" && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => ownerAction(r.id, "learn")}><Check className="size-3.5" /> {t("learning.learned")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => ownerAction(r.id, "reject")} aria-label={t("learning.reject")} title={t("learning.reject")}><X className="size-3.5" /></Button>
                  </>
                )}
                {isOwner && r.status !== "OPEN" && (
                  <Button size="sm" variant="ghost" onClick={() => ownerAction(r.id, "delete")} aria-label={t("common.delete")}><Trash2 className="size-3.5" /></Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={t("learning.suggest")}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call({ action: "suggest", ...form })) {
              setForm({ title: "", artist: "" });
              setOpen(false);
            }
          }}
        >
          <Field label={t("songs.colTitle")}><Input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={t("songs.colArtist")}><Input maxLength={200} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="primary">{t("common.save")}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
