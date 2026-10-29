"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { profile } from "@/content/profile";
import { GithubSeal } from "./GithubSeal";
import { HeroLeft } from "./HeroLeft";
import { HeroScene } from "./HeroScene";
import { RoleRoller } from "./RoleRoller";
import s from "./Hero.module.css";

/** `mobile`: the server-rendered phone diagram (HeroMobile), passed through so it ships no JS */
export function Hero({ mobile }: { mobile: ReactNode }) {
  const t = useTranslations("Hero");
  const { links, contacts } = profile;
  return (
    <section className={s.hero} id="top" aria-label={t("label")}>
      <HeroLeft>
        <h1 className={s.title}>
          {t("titleTop")}
          <br />
          <em>{t("titleEm")}</em>
        </h1>
        <div className={s.links}>
          <a href={links.linkedin} target="_blank" rel="noopener">
            {t("linkedin")} ↗
          </a>
          <a href={links.github} target="_blank" rel="noopener">
            {t("github")} ↗
          </a>
          <a className={s.cv} href={links.cv} download>
            {t("cv")}
          </a>
        </div>
        <div className={s.icons} role="group" aria-label={t("contact")}>
          <a
            href={contacts.phone.href}
            title={contacts.phone.title}
            aria-label={t("phone")}
          >
            tel
          </a>
          <a
            href={contacts.whatsapp.href}
            title={contacts.whatsapp.title}
            aria-label={t("whatsapp")}
            target="_blank"
            rel="noopener"
          >
            wa
          </a>
          <a
            href={contacts.email.href}
            title={contacts.email.title}
            aria-label={t("email")}
          >
            @
          </a>
        </div>
      </HeroLeft>

      <div className={s.media}>
        <HeroScene mobile={mobile} />
      </div>

      <GithubSeal href={links.github} label={t("sealLabel")} text={t("seal")} />

      <div className={s.roles}>
        <span className={s.pre} aria-hidden="true">
          {"//"}
        </span>
        <RoleRoller roles={t.raw("roles") as string[]} />
      </div>
    </section>
  );
}
