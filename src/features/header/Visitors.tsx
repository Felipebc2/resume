"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { CountUp } from "@/components/ui/CountUp";
import s from "./Header.module.css";

const SEEN = "gc-seen";

/** Visitor total under the language pill. GoatCounter's script loads only on a browser's first visit, so each browser counts once. */
export function Visitors({ code, count }: { code: string; count?: number }) {
  const t = useTranslations("Header");

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN)) return;
      localStorage.setItem(SEEN, "1");
    } catch {
      return; // storage blocked: skip rather than count every load
    }
    const js = document.createElement("script");
    js.async = true;
    js.src = "https://gc.zgo.at/count.js";
    js.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    document.head.append(js);
  }, [code]);

  if (!count) return null;
  return (
    <p className={s.visitors}>
      <CountUp to={count} delay={0.4} /> {t("visitors", { count })}
    </p>
  );
}
