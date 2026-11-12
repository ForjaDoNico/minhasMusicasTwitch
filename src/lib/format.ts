import type { Locale } from "@/lib/i18n/dictionaries";

export function formatMoney(amount: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(d: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(d));
}

export function formatTime(d: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}
