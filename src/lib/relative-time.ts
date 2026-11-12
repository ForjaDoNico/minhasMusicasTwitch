export type Locale = "pt-BR" | "en";

const UNITS = [
  { max: 60 * 60, div: 60, en: ["minute", "minutes"], pt: ["minuto", "minutos"] },
  { max: 24 * 3600, div: 3600, en: ["hour", "hours"], pt: ["hora", "horas"] },
  { max: 7 * 86400, div: 86400, en: ["day", "days"], pt: ["dia", "dias"] },
  { max: 30.44 * 86400, div: 7 * 86400, en: ["week", "weeks"], pt: ["semana", "semanas"] },
  { max: 365.25 * 86400, div: 30.44 * 86400, en: ["month", "months"], pt: ["mês", "meses"] },
  { max: Infinity, div: 365.25 * 86400, en: ["year", "years"], pt: ["ano", "anos"] },
] as const;

/**
 * Compact elapsed time with one decimal: "3.8 semanas", "2.1 months", "Nunca".
 * Matches the songlist "Última tocada" column.
 */
export function formatElapsed(
  date: string | Date | null | undefined,
  locale: Locale,
  now: Date = new Date(),
): string {
  if (!date) return locale === "pt-BR" ? "Nunca" : "Never";
  const seconds = Math.max(0, (now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return locale === "pt-BR" ? "agora" : "just now";
  const unit = UNITS.find((u) => seconds < u.max)!;
  const value = Math.round((seconds / unit.div) * 10) / 10;
  const names = locale === "pt-BR" ? unit.pt : unit.en;
  const label = value === 1 ? names[0] : names[1];
  const num = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${locale === "pt-BR" ? num.replace(".", ",") : num} ${label}`;
}

/** "há 3,8 semanas" / "3.8 weeks ago" (used by the bot and history tooltips). */
export function formatAgo(date: string | Date | null | undefined, locale: Locale, now = new Date()) {
  if (!date) return locale === "pt-BR" ? "nunca" : "never";
  const e = formatElapsed(date, locale, now);
  if (e === "agora" || e === "just now") return e;
  return locale === "pt-BR" ? `há ${e}` : `${e} ago`;
}
