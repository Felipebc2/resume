/** The four palettes: primary, secondary and the two backgrounds. In light mode primary and secondary swap.
    The full token set lives in styles/tokens.css; these hexes feed the settings-menu swatches. */
export const themes = [
  {
    id: "lemon",
    name: "Lemon",
    c: { p: "#fff21a", s: "#bfbcfc", dark: "#171717", light: "#f4f3ee" },
  },
  {
    id: "deep",
    name: "Deep",
    c: { p: "#3a0f34", s: "#eaaa00", dark: "#120b12", light: "#dde3eb" },
  },
  {
    id: "electric",
    name: "Electric",
    c: { p: "#4d7cff", s: "#2a2a2a", dark: "#0b0d12", light: "#e3e4e7" },
  },
  {
    id: "midnight",
    name: "Midnight",
    c: { p: "#afaea2", s: "#d21319", dark: "#1b1e4a", light: "#eeece6" },
  },
] as const;

export type Theme = (typeof themes)[number]["id"];
export type Mode = "dark" | "light";
export const DEFAULT_THEME: Theme = "electric";
