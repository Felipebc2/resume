import type messages from "@/i18n/messages/en.json";

export type StatFormat = "int" | "plus" | "times";

export type Stat = {
  key: keyof typeof messages.Stack.results;
  value: number;
  format: StatFormat;
};

/** contributions and repos are fallbacks; src/lib/github.ts replaces them with live values. */
export const stats: Stat[] = [
  { key: "contributions", value: 923, format: "int" },
  { key: "repos", value: 33, format: "int" },
  { key: "years", value: 3, format: "plus" },
  { key: "docs", value: 50, format: "plus" },
  { key: "wins", value: 3, format: "times" },
];
