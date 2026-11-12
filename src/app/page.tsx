import Link from "next/link";
import { Bot, ListMusic, MonitorPlay } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/site-header";
import { buttonClass } from "@/components/ui";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Landing() {
  const { t } = await getT();
  const supabase = await supabaseServer();
  const { data: channels } = await supabase.from("channels").select("slug, display_name").order("last_visited_at", { ascending: false, nullsFirst: false }).limit(6);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t("landing.title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t("landing.subtitle")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonClass("primary")}>{t("landing.cta")}</Link>
          {channels?.[0] && <Link href={`/t/${channels[0].slug}`} className={buttonClass("secondary")}>{t("landing.demo")}</Link>}
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ListMusic, text: t("landing.f1") },
            { icon: Bot, text: t("landing.f2") },
            { icon: MonitorPlay, text: t("landing.f3") },
          ].map((f) => (
            <div key={f.text} className="rounded-xl border border-border bg-surface p-5">
              <f.icon className="mb-3 size-6 text-accent" />
              <p className="text-sm">{f.text}</p>
            </div>
          ))}
        </div>
        {channels && channels.length > 0 && (
          <div className="mt-14 flex flex-wrap gap-2 text-sm">
            {channels.map((c) => <Link key={c.slug} href={`/t/${c.slug}`} className="rounded-full border border-border px-3 py-1 hover:border-accent">{c.display_name}</Link>)}
          </div>
        )}
      </main>
    </>
  );
}
