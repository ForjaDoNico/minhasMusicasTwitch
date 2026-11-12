import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, dictionaries, isLocale, translate, type Locale, type MessageKey } from "./dictionaries";

// Português é o padrão para todos; inglês só quando o usuário escolhe no seletor (cookie).
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, t: (key: MessageKey, vars?: Record<string, string | number>) => translate(dict, key, vars) };
}
