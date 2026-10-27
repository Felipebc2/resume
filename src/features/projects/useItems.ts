"use client";

import { useMessages, useTranslations } from "next-intl";
import { useMemo } from "react";
import { labs, projects, type Cat, type Project } from "@/content/projects";

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

export type Item = {
  id: string;
  name: string;
  kind: string;
  line: string;
  year: string;
  art: string;
  cat: Cat[];
  stack: string[];
  media?: Project["media"];
  mob: [number, number];
  badge?: string;
  problem: string;
  approach: string;
  outcome: string;
  ph?: boolean;
  lab?: boolean;
  nodes: Node[];
};

type ItemText = {
  name: string;
  kind?: string;
  line?: string;
  badge?: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  nodes?: Record<string, Omit<Node, "id" | "x" | "y" | "from">>;
};

/** bento projects, then lab notes; `all` feeds the search */
export function useItems() {
  const t = useTranslations("Projects");
  const texts = useMessages().Projects.items as Record<string, ItemText>;
  return useMemo(() => {
    const tbd = t("tbd");

    /* no drawn blueprint: Client (or Notes) → up to three stack parts, in a row */
    const auto = (stack: string[], lab: boolean, ph: boolean): Node[] => {
      const parts = [
        {
          label: t(lab ? "auto.notes" : "auto.client"),
          sub: ph ? tbd : t("auto.entry"),
        },
        ...stack.slice(0, 3).map((label) => ({
          label,
          sub: ph ? tbd : t(lab ? "auto.coursework" : "auto.layer"),
        })),
      ];
      const gap = parts.length > 1 ? (940 - NW) / (parts.length - 1) : 0;
      return parts.map((p, i) => ({
        ...p,
        id: `n${i}`,
        x: 30 + i * gap,
        y: 160,
        from: i ? `n${i - 1}` : undefined,
      }));
    };

    const ps: Item[] = projects.map(({ bp, ...p }) => {
      const m = texts[p.id];
      const stack = p.ph ? [tbd] : p.stack;
      return {
        ...p,
        stack,
        name: m.name,
        kind: m.kind ?? tbd,
        line: m.line ?? tbd,
        badge: m.badge,
        problem: m.problem ?? "",
        approach: m.approach ?? "",
        outcome: m.outcome ?? "",
        nodes: bp
          ? Object.entries(bp).map(([id, [col, row, from]]) => ({
              ...m.nodes![id],
              id,
              x: 30 + col * 250,
              y: row ? 260 : 130,
              from,
            }))
          : auto(stack, false, !!p.ph),
      };
    });

    const ls: Item[] = labs.map(({ id, lang }) => {
      const name = t(`labs.${id}`);
      return {
        id,
        name,
        kind: t("lab.kind"),
        line: t("lab.line", { lang }),
        year: "IDP",
        art: lang.toUpperCase(),
        cat: ["lab"],
        stack: [lang],
        mob: [1, 1],
        lab: true,
        problem: t("lab.problem", { name }),
        approach: t("lab.approach", { lang }),
        outcome: t("lab.outcome"),
        nodes: auto([lang], true, false),
      };
    });

    return { projects: ps, all: [...ps, ...ls] };
  }, [t, texts]);
}
