"use client";
import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, translate, type Locale, type MessageKey } from "./dictionaries";

const I18nContext = createContext<Locale>("pt-BR");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext);
}

export function useT() {
  const locale = useContext(I18nContext);
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(dictionaries[locale], key, vars),
    [locale],
  );
}

export function useSetLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };
}
