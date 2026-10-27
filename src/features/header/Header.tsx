import { getLocale, getTranslations } from "next-intl/server";
import { profile } from "@/content/profile";
import { MotionToggle } from "./MotionToggle";
import { Nav } from "./Nav";
import s from "./Header.module.css";

export async function Header() {
  const t = await getTranslations("Header");
  const locale = await getLocale();
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
          <MotionToggle />
          <a
            className={s.pill}
            href={locale === "en" ? "/pt" : "/"}
            hrefLang={locale === "en" ? "pt" : "en"}
          >
            <span aria-current={locale === "en" ? "true" : undefined}>EN</span>
            {" / "}
            <span aria-current={locale === "pt" ? "true" : undefined}>PT</span>
          </a>
        </div>
      </header>
    </>
  );
}
