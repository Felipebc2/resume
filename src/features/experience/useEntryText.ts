import { useLocale, useTranslations } from "next-intl";
import { profile } from "@/content/profile";
import { mi, span, type Entry } from "./entries";

export type Card = {
  k: string;
  title: string;
  s: string;
  m: string;
  pts: string[];
  tags: string[];
  links: [string, string][];
};

/** Localized copy for an entry: its git log line, its deck card and date helpers. */
export function useEntryText(now: number) {
  const t = useTranslations("Experience");
  const locale = useLocale();
  const month = (ym: string, opts: Intl.DateTimeFormatOptions) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(
      Date.UTC(y, m - 1),
    );
  };
  const fmt = (ym: string) => month(ym, { month: "short", year: "numeric" });
  const short = (ym: string) =>
    `${month(ym, { month: "short" })} ’${ym.slice(2, 4)}`;

  /** "Feb 2026 — Jun 2026 · 5m"; no end runs to now */
  const period = (start: string, end?: string) =>
    `${fmt(start)} — ${end ? fmt(end) : t("now")} · ${t("duration", span(mi(start), end ? mi(end) : null, now))}`;

  const title = (e: Entry) =>
    e.kind === "head"
      ? t("head.title")
      : e.kind === "work"
        ? t(`work.${e.id}.org`)
        : e.kind === "lab"
          ? t(`lab.${e.id}.name`)
          : t("degree.title");

  const card = (e: Entry): Card => {
    const base = { tags: [] as string[], links: [] as [string, string][] };
    switch (e.kind) {
      case "head":
        return {
          ...base,
          k: t("headKicker"),
          title: t("head.title"),
          s: t("head.sub"),
          m: t("head.meta"),
          pts: t.raw("head.pts") as string[],
          links: [
            [t("links.linkedin"), profile.links.linkedin],
            [t("links.github"), profile.links.github],
          ],
        };
      case "work": {
        return {
          ...base,
          k: `${t("kinds.work")} · ${t(`places.${e.place}`)}`,
          title: t(`work.${e.id}.org`),
          s: t(`work.${e.id}.role`),
          m: period(e.start, e.end),
          pts: t.raw(`work.${e.id}.pts`) as string[],
          tags: e.tags,
        };
      }
      case "lab":
        return {
          ...base,
          k:
            t(`kinds.${e.type}`) +
            (e.place ? ` · ${t(`places.${e.place}`)}` : ""),
          title: t(`lab.${e.id}.name`),
          s:
            t(`lab.${e.id}.detail`) +
            (e.rank ? ` · ${t("rankPlace", { rank: e.rank })}` : ""),
          m: e.end ? period(e.date, e.end) : fmt(e.date),
          pts: t.raw(`lab.${e.id}.pts`) as string[],
        };
      case "init":
        return {
          ...base,
          k: t("kinds.init"),
          title: t("degree.name"),
          s: t("degree.school", { n: e.semester }),
          m: `${fmt(e.start)} — ${fmt(e.end)} ${t("expected")}`,
          pts: t.raw("degree.pts") as string[],
        };
    }
  };

  return { t, fmt, short, title, card };
}
