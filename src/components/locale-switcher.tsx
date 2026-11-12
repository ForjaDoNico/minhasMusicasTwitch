"use client";
import { Languages } from "lucide-react";
import { useLocale, useSetLocale } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";

const LABELS: Record<Locale, string> = { "pt-BR": "PT", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted">
      <Languages className="size-4" aria-hidden />
      {LOCALES.map((l) => (
        <button key={l} onClick={() => setLocale(l)} aria-pressed={l === locale}
          className={l === locale ? "rounded px-1.5 py-0.5 font-bold text-fg bg-surface-2" : "rounded px-1.5 py-0.5 hover:text-fg"}>
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
