import type messages from "@/i18n/messages/en.json";

export type StatFormat = "int" | "plus" | "neg" | "ord";

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
  { key: "adrs", value: 20, format: "plus" },
  { key: "jusbrasil", value: 99.8, format: "neg" },
  { key: "ctf", value: 4, format: "ord" },
];
