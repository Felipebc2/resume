"use client";

import { useTranslations } from "next-intl";
import { profile } from "@/content/profile";
import { Nav } from "./Nav";
import { Settings } from "./Settings";
import { Visitors } from "./Visitors";
import s from "./Header.module.css";

export function Header({
  code,
  visitors,
}: {
  code?: string;
  visitors?: number;
}) {
  const t = useTranslations("Header");
  return (
    <>
      <a
        href="#stack"
        className="fixed top-[-60px] left-4 z-90 rounded-lg bg-fg px-3 py-2 text-black focus:top-[calc(12px+env(safe-area-inset-top,0px))]"
      >
        {t("skip")}
      </a>
      <header className={s.hdr}>
        <a className={s.logo} href="#top">
          {profile.handle}
          <span>/resume</span>
        </a>
        <Nav />
        <div className={s.tools}>
          <Settings />
          {code && <Visitors code={code} count={visitors} />}
        </div>
      </header>
    </>
  );
}
