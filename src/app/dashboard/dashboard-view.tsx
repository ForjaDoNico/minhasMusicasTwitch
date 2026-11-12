"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, Circle, Copy, MonitorPlay, Radio, RefreshCw, Settings, Shield, Trash2, Wallet } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, buttonClass } from "@/components/ui";
import { useToast } from "@/components/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { channelSettings, type Channel, type ChannelSettings, type ChannelStats, type Tip } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { LocalTime } from "@/components/local-time";

interface Props {
  channel: Channel;
  stats: ChannelStats;
  moderators: { id: string; twitch_login: string }[];
  tips: Tip[];
  sessionStartedAt: string | null;
  webhookToken: string;
  seChannelId: string;
  seConfigured: boolean;
  appUrl: string;
  botStatus: string | null;
  botDetail: string | null;
  hasDedicatedBot: boolean;
  twitchConfigured: boolean;
}

export function DashboardView(props: Props) {
  const { channel, stats } = props;
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const rpc = async (fn: "start_session" | "end_session" | "set_queue_open", args: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- union of rpc signatures
    const { error } = await (supabaseBrowser().rpc as any)(fn, args);
    if (error) toast(error.message, "error");
    router.refresh();
  };

  const steps = [
    { done: true, label: t("dashboard.step.twitch") },
    { done: stats.songs > 0, label: t("dashboard.step.songs"), href: `/t/${channel.slug}/songs` },
    { done: channel.bot_enabled, label: t("dashboard.step.bot") },
    { done: channel.queue_open, label: t("dashboard.step.queue") },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dashboard.onboarding")} />
          <ul className="space-y-2 p-4">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted" />}
                {s.href && !s.done ? <a href={s.href} className="text-accent hover:underline">{s.label}</a> : s.label}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <Button variant={channel.queue_open ? "secondary" : "primary"} onClick={() => rpc("set_queue_open", { p_channel_id: channel.id, p_open: !channel.queue_open })}>
              {channel.queue_open ? t("queue.closeQueue") : t("queue.openQueue")}
            </Button>
            <a href={`/t/${channel.slug}/queue`} className={buttonClass("secondary")}>{t("nav.queue")} →</a>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Radio className="size-4" /> {t("dashboard.live")}</span>} />
          <div className="space-y-3 p-4 text-sm">
            <p className="text-muted">{t("dashboard.liveHelp")}</p>
            <p>
              {props.sessionStartedAt ? (
                <Badge tone="success">{t("dashboard.sessionActive", { time: "" })}<LocalTime value={props.sessionStartedAt} /></Badge>
              ) : (
                <Badge>{t("dashboard.sessionInactive")}</Badge>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => rpc("start_session", { p_channel_id: channel.id })}>{t("dashboard.startSession")}</Button>
              {props.sessionStartedAt && <Button onClick={() => rpc("end_session", { p_channel_id: channel.id })}>{t("dashboard.endSession")}</Button>}
            </div>
          </div>
        </Card>
      </div>

      <BotSection {...props} />
      <SettingsSection channel={channel} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TipsSection {...props} />
        <div className="space-y-6">
          <ModeratorsSection channel={channel} initial={props.moderators} />
          <OverlaySection url={`${props.appUrl}/overlay/${channel.slug}`} />
        </div>
      </div>
      <p className="text-xs text-muted">{t("dashboard.keepAlive")}</p>
    </main>
  );
}

function CopyField({ value, testId }: { value: string; testId?: string }) {
  const t = useT();
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} className="font-mono text-xs" data-testid={testId} onFocus={(e) => e.target.select()} />
      <Button onClick={async () => { await navigator.clipboard.writeText(value); toast(t("dashboard.copied"), "success"); }} aria-label={t("dashboard.copy")}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

function BotSection({ channel, botStatus, botDetail, hasDedicatedBot, twitchConfigured }: Props) {
  const t = useT();
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Bot className="size-4" /> {t("dashboard.bot")}</span>}
        action={<Badge tone={channel.bot_enabled ? "success" : "neutral"}>{channel.bot_enabled ? t("dashboard.botConnected") : t("dashboard.botNotConnected")}</Badge>} />
      <div className="space-y-3 p-4 text-sm">
        <p className="text-muted">{t("dashboard.botHelp")}</p>
        {!twitchConfigured && <p className="rounded-md bg-warning/10 p-2 text-warning">TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET / TWITCH_EVENTSUB_SECRET are not set.</p>}
        {botStatus && (
          <p className={botStatus.startsWith("error") ? "text-danger" : "text-success"}>
            {botStatus}{botDetail ? `: ${botDetail}` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <a href="/api/twitch/authorize?type=channel" className={buttonClass(channel.bot_enabled ? "secondary" : "primary")}>
            {t("dashboard.botConnect")}
          </a>
          {channel.bot_enabled && (
            <form action="/api/twitch/disconnect" method="post">
              <Button type="submit" variant="danger">{t("dashboard.botDisconnect")}</Button>
            </form>
          )}
        </div>
        {hasDedicatedBot && (
          <p className="text-xs text-muted">
            {t("dashboard.botAccount")}: <a className="text-accent underline" href="/api/twitch/authorize?type=bot">/api/twitch/authorize?type=bot</a>
          </p>
        )}
      </div>
    </Card>
  );
}

function SettingsSection({ channel }: { channel: Channel }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [s, setS] = useState<ChannelSettings>(channelSettings(channel));
  const [busy, setBusy] = useState(false);
  const num = (k: keyof ChannelSettings) => ({
    type: "number",
    min: 0,
    step: "any",
    value: String(s[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) }),
  });
  const bool = (k: keyof ChannelSettings) => ({
    checked: Boolean(s[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.checked }),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabaseBrowser().from("channels").update({ settings: { ...s } }).eq("id", channel.id);
    setBusy(false);
    if (error) toast(error.message, "error");
    else {
      toast(t("common.saved"), "success");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Settings className="size-4" /> {t("dashboard.settings")}</span>} />
      <form onSubmit={save} className="grid gap-4 p-4 md:grid-cols-2" data-testid="settings-form">
        <div className="space-y-3">
          <Field label={t("dashboard.maxRequestsPerUser")}><Input {...num("maxRequestsPerUser")} step={1} /></Field>
          <Field label={t("dashboard.songCooldownHours")}><Input {...num("songCooldownHours")} /></Field>
          <Field label={t("dashboard.minTipForPriority")}><Input {...num("minTipForPriority")} /></Field>
          <Field label={t("dashboard.premiumMinTip")}><Input {...num("premiumMinTip")} /></Field>
          <Field label={t("dashboard.botLanguage")}>
            <Select value={s.botLanguage} onChange={(e) => setS({ ...s, botLanguage: e.target.value as "en" | "pt" })}>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </Select>
          </Field>
        </div>
        <div className="space-y-3">
          <Checkbox label={t("dashboard.preventDuplicates")} {...bool("preventDuplicates")} />
          <Checkbox label={t("dashboard.subscribersOnly")} {...bool("subscribersOnly")} />
          <Checkbox label={t("dashboard.vipsOnly")} {...bool("vipsOnly")} />
          <Checkbox label={t("dashboard.allowSiteRequests")} {...bool("allowSiteRequests")} />
          <Checkbox label={t("dashboard.allowAnonymous")} {...bool("allowAnonymous")} />
          <Checkbox label={t("dashboard.tipPriority")} {...bool("tipPriority")} />
          <hr className="border-border" />
          <Field label={t("dashboard.currency")}>
            <Select value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })}>
              {["BRL", "USD", "EUR"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label={t("dashboard.pixKey")}><Input value={s.pixKey} onChange={(e) => setS({ ...s, pixKey: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("dashboard.pixName")}><Input value={s.pixName} onChange={(e) => setS({ ...s, pixName: e.target.value })} /></Field>
            <Field label={t("dashboard.pixCity")}><Input value={s.pixCity} onChange={(e) => setS({ ...s, pixCity: e.target.value })} /></Field>
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" disabled={busy}>{t("common.save")}</Button>
        </div>
      </form>
    </Card>
  );
}

function TipsSection({ channel, tips, webhookToken, seChannelId, seConfigured, appUrl }: Props) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [token, setToken] = useState(webhookToken);
  const [se, setSe] = useState({ id: seChannelId, jwt: "" });

  const saveSecrets = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/dashboard/secrets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { ok: boolean; tip_webhook_token?: string };
    if (!data.ok) return toast(t("common.error"), "error");
    if (data.tip_webhook_token) setToken(data.tip_webhook_token);
    toast(t("common.saved"), "success");
  };
  const syncSE = async () => {
    const res = await fetch("/api/tips/streamelements", { method: "POST" });
    const data = (await res.json()) as { ok: boolean; count?: number; error?: string };
    if (!data.ok) return toast(data.error ?? t("common.error"), "error");
    toast(t("dashboard.seSynced", { count: data.count ?? 0 }), "success");
    router.refresh();
  };
  const currency = channelSettings(channel).currency;

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Wallet className="size-4" /> {t("dashboard.tips")}</span>} />
      <div className="space-y-5 p-4 text-sm">
        <div>
          <Field label={t("dashboard.tipWebhook")} hint={t("dashboard.tipWebhookHelp")}>
            <CopyField value={`${appUrl}/api/tips/webhook/${channel.id}?token=${token}`} />
          </Field>
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => saveSecrets({ regenerateWebhookToken: true })}>
            <RefreshCw className="size-3.5" /> token
          </Button>
        </div>
        <div className="space-y-2">
          <div className="font-medium">{t("dashboard.seSync")}</div>
          <Field label={t("dashboard.seChannelId")}><Input value={se.id} onChange={(e) => setSe({ ...se, id: e.target.value })} /></Field>
          <Field label={t("dashboard.seJwt")}><Input type="password" placeholder={seConfigured ? "••••••••" : ""} value={se.jwt} onChange={(e) => setSe({ ...se, jwt: e.target.value })} /></Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveSecrets({ streamelementsChannelId: se.id, streamelementsJwt: se.jwt || undefined })}>{t("common.save")}</Button>
            <Button size="sm" variant="primary" onClick={syncSE}>{t("dashboard.seSyncNow")}</Button>
          </div>
        </div>
        <div>
          <div className="mb-2 font-medium">{t("dashboard.recentTips")}</div>
          {tips.length === 0 ? (
            <p className="text-muted">{t("dashboard.noTips")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {tips.map((tip) => (
                <li key={tip.id} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 truncate">{tip.donor_name}{tip.message ? <span className="text-muted"> — {tip.message}</span> : null}</span>
                  <Badge tone="warning">{formatMoney(Number(tip.amount), tip.currency || currency, locale)}</Badge>
                  <span className="text-xs text-muted">{tip.provider}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function ModeratorsSection({ channel, initial }: { channel: Channel; initial: { id: string; twitch_login: string }[] }) {
  const t = useT();
  const toast = useToast();
  const [mods, setMods] = useState(initial);
  const [login, setLogin] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = login.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_]{2,25}$/.test(clean)) return;
    const { data, error } = await supabaseBrowser().from("moderators").insert({ channel_id: channel.id, twitch_login: clean }).select("id, twitch_login").single();
    if (error) return toast(error.message, "error");
    setMods([...mods, data]);
    setLogin("");
  };
  const remove = async (id: string) => {
    const { error } = await supabaseBrowser().from("moderators").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    setMods(mods.filter((m) => m.id !== id));
  };

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Shield className="size-4" /> {t("dashboard.moderators")}</span>} />
      <div className="space-y-3 p-4 text-sm">
        <p className="text-muted">{t("dashboard.moderatorsHelp")}</p>
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="twitch_login" value={login} onChange={(e) => setLogin(e.target.value)} />
          <Button type="submit">{t("dashboard.addModerator")}</Button>
        </form>
        <ul className="divide-y divide-border">
          {mods.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-1.5">
              <span>@{m.twitch_login}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(m.id)} aria-label={t("common.delete")}><Trash2 className="size-3.5" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function OverlaySection({ url }: { url: string }) {
  const t = useT();
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><MonitorPlay className="size-4" /> {t("dashboard.overlay")}</span>} />
      <div className="space-y-2 p-4 text-sm">
        <p className="text-muted">{t("dashboard.overlayHelp")}</p>
        <CopyField value={url} testId="overlay-url" />
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">{url}</a>
      </div>
    </Card>
  );
}
