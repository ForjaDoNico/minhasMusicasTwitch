"use client";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const t = useT();
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    document.cookie = `theme=${dark ? "dark" : "light"};path=/;max-age=31536000;samesite=lax`;
  };
  return (
    <button onClick={toggle} title={t("theme.toggle")} aria-label={t("theme.toggle")}
      className="inline-flex items-center gap-2 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
      {!compact && <span className="text-xs">{t("theme.toggle")}</span>}
    </button>
  );
}
