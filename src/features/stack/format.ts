import type { StatFormat } from "@/content/stats";

export function formatStat(v: number, format: StatFormat, locale = "en-US") {
  switch (format) {
    case "int":
      return Math.round(v).toLocaleString(locale);
    case "plus":
      return `${Math.round(v)}+`;
    case "times":
      return `${Math.round(v)}×`;
  }
}
