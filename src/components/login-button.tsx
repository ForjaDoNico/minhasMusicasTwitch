"use client";
import { LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { DEV_LOGIN_ENABLED } from "@/lib/env";
import { buttonClass } from "@/components/ui";

export function LoginButton({ next, className, label }: { next?: string; className?: string; label?: string }) {
  const t = useT();
  const pathname = usePathname();
  const login = async () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? pathname)}`;
    await supabaseBrowser().auth.signInWithOAuth({ provider: "twitch", options: { redirectTo } });
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={login} className={className ?? buttonClass("primary", "sm")}>
        <LogIn className="size-4" /> {label ?? t("auth.loginTwitch")}
      </button>
      {DEV_LOGIN_ENABLED && (
        <a href={`/dev/login?next=${encodeURIComponent(next ?? pathname)}`} className="text-xs text-muted underline">
          {t("auth.devLogin")}
        </a>
      )}
    </span>
  );
}
