"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Bot, ChevronsLeft, ChevronsRight, Crown, GraduationCap, HelpCircle, History, Home, LayoutDashboard,
  ListMusic, LogOut, Menu, Music, Save, X,
} from "lucide-react";
import { useChannelLive, RealtimeIndicator } from "@/components/channel-live";
import { useT } from "@/lib/i18n/client";
import { Avatar, Badge } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginButton } from "@/components/login-button";
import type { MessageKey } from "@/lib/i18n/dictionaries";

type NavItem = { href: string; label: MessageKey; icon: typeof Home; badge?: React.ReactNode };

export function ChannelShell({ children }: { children: React.ReactNode }) {
  const { channel, viewer, isOwner } = useChannelLive();
  const t = useT();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/t/${channel.slug}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted preference after hydration
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on navigation
    setMobileOpen(false);
  }, [pathname]);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const live: NavItem[] = [
    { href: base, label: "nav.home", icon: Home },
    {
      href: `${base}/queue`,
      label: "nav.queue",
      icon: ListMusic,
      badge: (
        <Badge tone={channel.queue_open ? "success" : "neutral"} data-testid="queue-status-badge">
          {channel.queue_open ? t("queue.open") : t("queue.closed")}
        </Badge>
      ),
    },
  ];
  const library: NavItem[] = [
    { href: `${base}/songs`, label: "nav.songs", icon: Music },
    { href: `${base}/saved`, label: "nav.saved", icon: Save },
    { href: `${base}/learning`, label: "nav.learning", icon: GraduationCap },
    { href: `${base}/history`, label: "nav.history", icon: History },
    { href: `${base}/commands`, label: "nav.commands", icon: Bot },
    { href: `${base}/premium`, label: "nav.premium", icon: Crown },
  ];

  const renderItem = (item: NavItem) => {
    const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          title={collapsed ? t(item.label) : undefined}
          className={clsx(
            "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
            active ? "bg-accent/15 font-semibold text-accent" : "text-fg/85 hover:bg-surface-2",
          )}
        >
          <item.icon className="size-4 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{t(item.label)}</span>}
          {!collapsed && item.badge}
        </Link>
      </li>
    );
  };

  const nav = (
    <div className="flex h-full flex-col">
      <div className={clsx("flex items-center gap-3 border-b border-border p-3", collapsed && "flex-col")}>
        <Avatar src={channel.avatar_url} name={channel.display_name} size={collapsed ? 32 : 40} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{channel.display_name}</div>
            <a href={`https://twitch.tv/${channel.slug}`} target="_blank" rel="noreferrer" className="truncate text-xs text-muted hover:text-accent">
              twitch.tv/{channel.slug}
            </a>
          </div>
        )}
        <button onClick={toggleCollapsed} className="hidden rounded p-1 text-muted hover:bg-surface-2 lg:block"
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")} title={collapsed ? t("nav.expand") : t("nav.collapse")}>
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {!collapsed && <div className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{t("nav.live")}</div>}
        <ul className="space-y-0.5">{live.map(renderItem)}</ul>
        {!collapsed && <div className="px-2.5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted">{t("nav.library")}</div>}
        <ul className={clsx("space-y-0.5", collapsed && "mt-3 border-t border-border pt-3")}>{library.map(renderItem)}</ul>
        {isOwner && (
          <ul className="mt-3 space-y-0.5 border-t border-border pt-3">
            {renderItem({ href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard })}
          </ul>
        )}
      </nav>
      <div className={clsx("space-y-3 border-t border-border p-3", collapsed && "flex flex-col items-center")}>
        {viewer ? (
          <div className="flex items-center gap-2">
            <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={24} />
            {!collapsed && <span className="flex-1 truncate text-sm">{viewer.displayName}</span>}
            <form action="/auth/signout" method="post">
              <button className="rounded p-1 text-muted hover:bg-surface-2" title={t("auth.logout")} aria-label={t("auth.logout")}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        ) : (
          !collapsed && <LoginButton />
        )}
        <div className={clsx("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
          {!collapsed && <LocaleSwitcher />}
          <ThemeToggle compact />
          <Link href="/help" className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-fg" title={t("nav.help")} aria-label={t("nav.help")}>
            <HelpCircle className="size-4" />
          </Link>
        </div>
        {!collapsed && <RealtimeIndicator />}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-2 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label={t("nav.menu")} className="rounded p-1.5 hover:bg-surface-2">
          <Menu className="size-5" />
        </button>
        <Avatar src={channel.avatar_url} name={channel.display_name} size={28} />
        <span className="flex-1 truncate font-semibold">{channel.display_name}</span>
        <RealtimeIndicator />
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-2 rounded p-1 text-muted" aria-label={t("common.close")}>
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <aside className={clsx("sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface lg:block", collapsed ? "w-16" : "w-64")}>
        {nav}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

