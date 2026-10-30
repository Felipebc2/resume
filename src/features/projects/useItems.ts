"use client";

import { useMessages, useTranslations } from "next-intl";
import { useMemo } from "react";
import { labs, projects, type Project } from "@/content/projects";

/** blueprint node box, in SVG units (viewBox 1000 × 380) */
export const NW = 190;
export const NH = 62;

export type Node = {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  why?: string;
  /** parent node and the label on the edge coming from it */
  from?: string;
  in?: string;
};

type ItemText = {
  name: string;
  kind: string;
  line: string;
  badge?: string;
  /** course the project came from */
  acad?: string;
  problem: string;
  approach: string;
  outcome: string;
  nodes?: Record<string, Omit<Node, "id" | "x" | "y" | "from">>;
};

export type Item = Omit<Project, "id" | "bp" | "mob"> &
  Omit<ItemText, "nodes"> & { id: string; lab?: boolean; nodes: Node[] };

/** bento projects, then lab notes; `all` feeds the search */
export function useItems() {
  const t = useTranslations("Projects");
  const msgs = useMessages().Projects;
  const texts = msgs.items as Record<string, ItemText>;
  const labTexts = msgs.labs as Record<
    string,
    { name: string; line?: string; approach?: string }
  >;
  return useMemo(() => {
    /* the bento needs each card's phone span; lab notes have no card */
    const ps: (Item & Pick<Project, "mob">)[] = projects.map(({ bp, ...p }) => {
      const { nodes, ...m } = texts[p.id];
      return {
        ...p,
        ...m,
        acad: m.acad && t("acad", { course: m.acad }),
        nodes: Object.entries(bp).map(([id, [col, row, from]]) => ({
          ...nodes![id],
          id,
          x: 30 + col * 250,
          y: row ? 260 : 130,
          from,
        })),
      };
    });

    const ls: Item[] = labs.map(({ id, lang, year }) => {
      const { name, line, approach } = labTexts[id];
      return {
        id,
        name,
        kind: t("lab.kind"),
        line: line ?? t("lab.line", { lang }),
        year,
        acad: t("lab.course"),
        art: lang.toUpperCase(),
        cat: ["lab", "acad"],
        stack: [lang],
        lab: true,
        problem: t("lab.problem", { name }),
        approach: approach ?? t("lab.approach", { lang }),
        outcome: t("lab.outcome"),
        /* no drawn blueprint: Notes → the language, in a row */
        nodes: [
          {
            id: "n0",
            x: 30,
            y: 160,
            label: t("auto.notes"),
            sub: t("auto.entry"),
          },
          {
            id: "n1",
            x: 30 + (940 - NW),
            y: 160,
            label: lang,
            sub: t("auto.coursework"),
            from: "n0",
          },
        ],
      };
    });

    return { projects: ps, all: [...ps, ...ls] };
  }, [t, texts, labTexts]);
}
