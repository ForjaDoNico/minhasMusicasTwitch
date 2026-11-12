import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { APP_URL, serverEnv } from "@/lib/env";
import { LoginButton } from "@/components/login-button";
import { Button, Card } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { t } = await getT();
  const viewer = await getViewer();
  const sp = await searchParams;

  if (!viewer) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="mb-3 text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="mb-6 text-muted">{t("dashboard.needLogin")}</p>
          <LoginButton next="/dashboard" />
        </main>
      </>
    );
  }

  const supabase = await supabaseServer();
  const { data: channel } = await supabase.from("channels").select("*").eq("owner_id", viewer.id).maybeSingle();

  if (!channel) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card className="p-6 text-center">
            <h1 className="mb-2 text-2xl font-bold">{t("dashboard.welcome", { name: viewer.displayName })}</h1>
            <p className="mb-6 text-sm text-muted">{t("dashboard.createChannelHelp", { url: `${APP_URL}/t/${viewer.login}` })}</p>
            {sp.error && <p className="mb-4 text-sm text-danger">{t("common.error")}</p>}
            <form action="/api/channels/create" method="post">
              <Button type="submit" variant="primary" data-testid="create-channel">{t("dashboard.createChannel")}</Button>
            </form>
          </Card>
        </main>
      </>
    );
  }

  const [{ data: stats }, { data: moderators }, { data: tips }, { data: session }, { data: secret }] = await Promise.all([
    supabase.rpc("channel_stats", { p_channel_id: channel.id }),
    supabase.from("moderators").select("*").eq("channel_id", channel.id).order("twitch_login"),
    supabase.from("tips").select("*").eq("channel_id", channel.id).order("created_at", { ascending: false }).limit(10),
    channel.current_session_id
      ? supabase.from("stream_sessions").select("*").eq("id", channel.current_session_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin().from("channel_secrets").select("tip_webhook_token, streamelements_channel_id, streamelements_jwt").eq("channel_id", channel.id).maybeSingle(),
  ]);

  return (
    <>
      <SiteHeader>
        <Link href={`/t/${channel.slug}`} className="text-sm text-accent hover:underline">{t("dashboard.publicPage")} →</Link>
      </SiteHeader>
      <DashboardView
        channel={channel}
        stats={stats as never}
        moderators={moderators ?? []}
        tips={tips ?? []}
        sessionStartedAt={session?.started_at ?? null}
        webhookToken={secret?.tip_webhook_token ?? ""}
        seChannelId={secret?.streamelements_channel_id ?? ""}
        seConfigured={!!secret?.streamelements_jwt}
        appUrl={APP_URL}
        botStatus={sp.bot ?? null}
        botDetail={sp.detail ?? null}
        hasDedicatedBot={!!serverEnv().botUserId}
        twitchConfigured={!!serverEnv().twitchClientId}
      />
    </>
  );
}
