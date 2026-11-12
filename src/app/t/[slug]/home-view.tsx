"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, Crown, History, ListMusic, Music, Save, GraduationCap } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useLocale, useT } from "@/lib/i18n/client";
import { Badge, Card, CardHeader } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import type { ChannelStats } from "@/lib/types";
import { QueueControlsCompact } from "./queue/queue-controls";

export function HomeView({ initialStats }: { initialStats: ChannelStats }) {
  const { channel, nowPlaying, queue, version, settings, isManager } = useChannelLive();
  const t = useT();
  const locale = useLocale();
  const [stats, setStats] = useState(initialStats);
  const base = `/t/${channel.slug}`;

  useEffect(() => {
    if (version === 0) return;
    void supabaseBrowser()
      .rpc("channel_stats", { p_channel_id: channel.id })
      .then(({ data }) => data && setStats(data as unknown as ChannelStats));
  }, [version, channel.id]);

  const next = queue.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title={t("home.nowPlaying")} />
          <div className="p-4" data-testid="home-now-playing">
            {nowPlaying?.song ? (
              <div>
                <div className="text-xl font-bold">{nowPlaying.song.title}</div>
                <div className="text-muted">{nowPlaying.song.artist}</div>
                <div className="mt-2 text-xs text-muted">
                  {t("queue.requestedBy")} <span className="font-medium text-fg">{nowPlaying.requester_name}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted">{t("home.nothingPlaying")}</p>
            )}
            {isManager && <QueueControlsCompact />}
          </div>
        </Card>
        <Card>
          <CardHeader title={t("home.upNext")} action={<Link href={`${base}/queue`} className="text-sm text-accent hover:underline">{t("home.openQueue")}</Link>} />
          <div className="p-4">
            {!channel.queue_open && queue.length === 0 ? (
              <p className="text-muted">{t("home.queueClosedHint")}</p>
            ) : next.length === 0 ? (
              <p className="text-muted">{t("home.queueEmpty")}</p>
            ) : (
              <ol className="space-y-2">
                {next.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-3">
                    <span className="w-5 text-right text-sm font-bold text-muted">{item.position}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{item.song?.title}</span>
                      <span className="text-muted"> — {item.song?.artist}</span>
                    </span>
                    <span className="text-xs text-muted">{item.requester_name}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>

      <div>
        {!stats.live && <p className="mb-2 text-xs text-muted">{t("home.notLive")}</p>}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label={t("home.playedThisStream")} value={stats.played_session} testId="metric-played" />
          <Metric label={t("home.requestsThisStream")} value={stats.requests_session} testId="metric-requests" />
          <Metric
            label={t("home.tipsThisStream")}
            value={formatMoney(Number(stats.tips_session_amount), settings.currency, locale)}
            sub={t("home.tipsDonors", { count: stats.tips_session_donors })}
          />
          <Metric label={t("home.totalRequests")} value={stats.requests_total} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Shortcut href={`${base}/songs`} icon={Music} title={t("nav.songs")} sub={t("home.songsCount", { count: stats.songs })} />
        <Shortcut href={`${base}/queue`} icon={ListMusic} title={t("nav.queue")}
          sub={<Badge tone={channel.queue_open ? "success" : "neutral"}>{channel.queue_open ? t("queue.open") : t("queue.closed")}</Badge>} />
        <Shortcut href={`${base}/saved`} icon={Save} title={t("nav.saved")} sub={t("home.savedCount", { count: stats.saved })} />
        <Shortcut href={`${base}/history`} icon={History} title={t("nav.history")} sub={t("home.historyCount", { count: stats.played_session })} />
        <Shortcut href={`${base}/commands`} icon={Bot} title={t("nav.commands")} sub={t("home.commandsCount", { count: stats.commands })} />
        <Shortcut href={`${base}/premium`} icon={Crown} title={t("nav.premium")} sub={t("home.premiumCount", { count: stats.premium })} />
        <Shortcut href={`${base}/learning`} icon={GraduationCap} title={t("nav.learning")} sub={t("home.learningCount", { count: stats.learning })} />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, testId }: { label: string; value: React.ReactNode; sub?: string; testId?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold" data-testid={testId}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Card>
  );
}

function Shortcut({ href, icon: Icon, title, sub }: { href: string; icon: typeof Music; title: string; sub: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50">
      <span className="rounded-lg bg-accent/10 p-2.5 text-accent"><Icon className="size-5" /></span>
      <span>
        <span className="block font-semibold group-hover:text-accent">{title}</span>
        <span className="text-sm text-muted">{sub}</span>
      </span>
    </Link>
  );
}
