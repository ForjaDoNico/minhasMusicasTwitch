import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, dictionaries, isLocale, translate, type Locale, type MessageKey } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accept) ? "en" : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, t: (key: MessageKey, vars?: Record<string, string | number>) => translate(dict, key, vars) };
}
