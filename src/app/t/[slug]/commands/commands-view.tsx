"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Badge, Button, Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { ConfirmButton } from "@/components/confirm-button";
import { useToast } from "@/components/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ACTIONS, TEMPLATE_VARIABLES, type BotAction } from "@/lib/commands";
import { validateTemplate } from "@/lib/template";
import type { BotCommandRow } from "@/lib/types";

const INFO_ACTIONS: BotAction[] = ["CURRENT_SONG", "NEXT_SONG", "LAST_SONG", "PLAYED_TODAY", "SONG_DETAILS", "SONGLIST_LINK", "QUEUE_LINK", "COMMANDS_LINK"];

export function CommandsView({ initial }: { initial: BotCommandRow[] }) {
  const { channel, isOwner } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const [commands, setCommands] = useState(initial);
  const [filter, setFilter] = useState<BotAction | "">("");
  const [editing, setEditing] = useState<BotCommandRow | "new" | null>(null);

  const reload = async () => {
    const { data } = await supabaseBrowser().from("bot_commands").select("*").eq("channel_id", channel.id).order("is_default", { ascending: false }).order("created_at");
    if (data) setCommands(data);
  };

  const visible = useMemo(() => (filter ? commands.filter((c) => c.action === filter) : commands), [commands, filter]);

  const toggle = async (c: BotCommandRow) => {
    const { error } = await supabaseBrowser().from("bot_commands").update({ enabled: !c.enabled }).eq("id", c.id);
    if (error) toast(error.message, "error");
    else setCommands((all) => all.map((x) => (x.id === c.id ? { ...x, enabled: !c.enabled } : x)));
  };

  const remove = async (c: BotCommandRow) => {
    const { error } = await supabaseBrowser().from("bot_commands").delete().eq("id", c.id);
    if (error) toast(error.message, "error");
    else setCommands((all) => all.filter((x) => x.id !== c.id));
  };

  return (
    <div>
      <PageHeader
        title={t("commands.title")}
        actions={
          <>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as BotAction | "")} aria-label={t("commands.filterAction")} className="w-56">
              <option value="">{t("commands.filterAction")}: {t("common.all")}</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{t(`action.${a}`)}</option>)}
            </Select>
            {isOwner && <Button variant="primary" onClick={() => setEditing("new")}><Plus className="size-4" /> {t("commands.new")}</Button>}
          </>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="commands-table">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">{t("commands.colName")}</th>
              <th className="px-3 py-2">{t("commands.colCommand")}</th>
              <th className="px-3 py-2">{t("commands.colAction")}</th>
              <th className="px-3 py-2">{t("commands.colResponse")}</th>
              <th className="px-3 py-2">{t("commands.colCooldown")}</th>
              <th className="px-3 py-2">{t("commands.colStatus")}</th>
              <th className="px-3 py-2">{t("commands.colType")}</th>
              {isOwner && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} className="border-b border-border align-top last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{c.description}</div>
                </td>
                <td className="px-3 py-2">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-accent">!{c.command}</code>
                  {c.aliases.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.aliases.map((a) => <code key={a} className="font-mono text-[11px] text-muted">!{a}</code>)}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{INFO_ACTIONS.includes(c.action) ? t("commands.none") : t(`action.${c.action}`)}</td>
                <td className="max-w-sm px-3 py-2 font-mono text-xs text-muted">{c.response_template || t("commands.none")}</td>
                <td className="whitespace-nowrap px-3 py-2">{c.cooldown_sec ? `${c.cooldown_sec}s` : t("commands.none")}</td>
                <td className="px-3 py-2">
                  {isOwner ? (
                    <button onClick={() => toggle(c)} aria-pressed={c.enabled}>
                      <Badge tone={c.enabled ? "success" : "neutral"}>{c.enabled ? t("commands.enabled") : t("commands.disabled")}</Badge>
                    </button>
                  ) : (
                    <Badge tone={c.enabled ? "success" : "neutral"}>{c.enabled ? t("commands.enabled") : t("commands.disabled")}</Badge>
                  )}
                </td>
                <td className="px-3 py-2"><Badge tone={c.is_default ? "neutral" : "accent"}>{c.is_default ? t("commands.default") : t("commands.custom")}</Badge></td>
                {isOwner && (
                  <td className="whitespace-nowrap px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={t("common.edit")}><Pencil className="size-3.5" /></Button>
                    {!c.is_default && (
                      <ConfirmButton variant="ghost" message={`${t("common.delete")} !${c.command}?`} onConfirm={() => remove(c)} aria-label={t("common.delete")}>
                        <Trash2 className="size-3.5" />
                      </ConfirmButton>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {isOwner && <CommandForm command={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  );
}

function CommandForm({ command, onClose, onSaved }: { command: BotCommandRow | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { channel } = useChannelLive();
  const t = useT();
  const toast = useToast();
  const empty = { name: "", description: "", command: "", aliases: "", action: "CUSTOM" as BotAction, response_template: "", cooldown_sec: 5, enabled: true };
  const [form, setForm] = useState(empty);
  const isDefault = command !== "new" && !!command?.is_default;

  useEffect(() => {
    if (!command) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form when opening another command
    setForm(command === "new" ? empty : {
      name: command.name, description: command.description, command: command.command, aliases: command.aliases.join(", "),
      action: command.action, response_template: command.response_template, cooldown_sec: command.cooldown_sec, enabled: command.enabled,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  const templateError = validateTemplate(form.response_template);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (templateError) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      command: form.command.replace(/^!/, "").trim(),
      aliases: [...new Set(form.aliases.split(",").map((a) => a.replace(/^!/, "").trim()).filter((a) => /^[A-Za-z0-9_]{1,32}$/.test(a)))],
      action: form.action,
      response_template: form.response_template,
      cooldown_sec: Math.max(0, Number(form.cooldown_sec) || 0),
      enabled: form.enabled,
    };
    const supabase = supabaseBrowser();
    const { error } =
      command === "new"
        ? await supabase.from("bot_commands").insert({ ...payload, channel_id: channel.id })
        : isDefault
          // default commands keep their trigger and action
          ? await supabase.from("bot_commands").update({ aliases: payload.aliases, response_template: payload.response_template, cooldown_sec: payload.cooldown_sec, enabled: payload.enabled, description: payload.description }).eq("id", (command as BotCommandRow).id)
          : await supabase.from("bot_commands").update(payload).eq("id", (command as BotCommandRow).id);
    if (error) return toast(error.message, "error");
    toast(t("common.saved"), "success");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!command} onClose={onClose} title={command === "new" ? t("commands.new") : t("commands.edit")} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label={t("commands.colName")}><Input required disabled={isDefault} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="!command"><Input required disabled={isDefault} pattern="!?[A-Za-z0-9_]{1,32}" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        <Field label="Aliases" hint={t("commands.aliasesHelp")}><Input value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} /></Field>
        <Field label={t("commands.colAction")}>
          <Select disabled={isDefault} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as BotAction })}>
            {ACTIONS.map((a) => <option key={a} value={a}>{t(`action.${a}`)}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("commands.colResponse")} hint={t("commands.templateHelp", { vars: TEMPLATE_VARIABLES[form.action].map((v) => `{{${v}}}`).join(", ") })}>
            <Textarea className="font-mono" value={form.response_template} onChange={(e) => setForm({ ...form, response_template: e.target.value })} />
          </Field>
          {templateError && <p className="mt-1 text-xs text-danger">{templateError}</p>}
        </div>
        <Field label={t("commands.cooldownSec")}><Input type="number" min={0} value={form.cooldown_sec} onChange={(e) => setForm({ ...form, cooldown_sec: Number(e.target.value) })} /></Field>
        <div className="flex items-end pb-2"><Checkbox label={t("commands.enabled")} checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!!templateError}>{t("common.save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
