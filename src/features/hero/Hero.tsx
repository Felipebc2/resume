"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { profile } from "@/content/profile";
import { GithubSeal } from "./GithubSeal";
import { HeroLeft } from "./HeroLeft";
import { HeroScene } from "./HeroScene";
import { RoleRoller } from "./RoleRoller";
import s from "./Hero.module.css";

// Phosphor (regular) contact glyphs, inline so they take the link's colour
const ICONS = {
  phone:
    "M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z",
  whatsapp:
    "M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM152,176a72.08,72.08,0,0,1-72-72A24,24,0,0,1,99.29,80.46l11.48,23L101,118a8,8,0,0,0-.73,7.51,56.47,56.47,0,0,0,30.15,30.15A8,8,0,0,0,138,155l14.61-9.74,23,11.48A24,24,0,0,1,152,176ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z",
  email:
    "M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z",
};
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 256 256" aria-hidden="true">
    <path d={d} fill="currentColor" />
  </svg>
);

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
            <Icon d={ICONS.phone} />
          </a>
          <a
            href={contacts.whatsapp.href}
            title={contacts.whatsapp.title}
            aria-label={t("whatsapp")}
            target="_blank"
            rel="noopener"
          >
            <Icon d={ICONS.whatsapp} />
          </a>
          <a
            href={contacts.email.href}
            title={contacts.email.title}
            aria-label={t("email")}
          >
            <Icon d={ICONS.email} />
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
