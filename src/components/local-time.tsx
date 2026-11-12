"use client";
import { useSyncExternalStore } from "react";
import { useLocale } from "@/lib/i18n/client";
import { formatDateTime, formatTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * Dates are formatted only in the browser: the server (UTC on Vercel) and the viewer's
 * time zone differ, which would otherwise cause hydration mismatches and wrong times.
 */
export function LocalTime({ value, mode = "datetime" }: { value: string; mode?: "datetime" | "time" }) {
  const locale = useLocale();
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <time dateTime={value} className="tabular-nums">
      {isClient ? (mode === "time" ? formatTime(value, locale) : formatDateTime(value, locale)) : ""}
    </time>
  );
}
