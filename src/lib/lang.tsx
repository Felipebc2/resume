"use client";

import { NextIntlClientProvider, type Locale, type Messages } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";

const KEY = "fbc2-lang";
const SetLang = createContext<(l: Locale) => void>(() => {});

/** Switches the language in place: same URL, another dictionary. The server renders English; Portuguese loads on demand. */
export const useSetLang = () => useContext(SetLang);

export function LangProvider({
  en,
  timeZone,
  children,
}: {
  en: Messages;
  timeZone: string;
  children: ReactNode;
}) {
  const [{ locale, messages }, set] = useState({
    locale: "en" as Locale,
    messages: en,
  });

  const load = (l: Locale) =>
    (l === "pt"
      ? import("@/i18n/messages/pt.json").then((m) => m.default as Messages)
      : Promise.resolve(en)
    ).then((m) => {
      document.documentElement.lang = l === "pt" ? "pt-BR" : "en";
      set({ locale: l, messages: m });
    });

  const setLang = (l: Locale) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    load(l);
  };

  const restore = useEffectEvent(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved === "pt") load("pt");
  });
  useEffect(() => restore(), []);

  return (
    <SetLang value={setLang}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </SetLang>
  );
}
