import Link from "next/link";
import { Music2 } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginButton } from "@/components/login-button";
import { Avatar } from "@/components/ui";

export async function SiteHeader({ children }: { children?: React.ReactNode }) {
  const viewer = await getViewer();
  const { t } = await getT();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Music2 className="size-5 text-accent" /> {t("app.name")}
        </Link>
        <div className="flex-1">{children}</div>
        <LocaleSwitcher />
        <ThemeToggle compact />
        {viewer ? (
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm">
              <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={24} />
              <span className="hidden sm:inline">{viewer.displayName}</span>
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-xs text-muted hover:text-fg">{t("auth.logout")}</button>
            </form>
          </div>
        ) : (
          <LoginButton />
        )}
      </div>
    </header>
  );
}
