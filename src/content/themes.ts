/** Theme ids and the swatch each one shows in the settings menu. The tokens themselves live in styles/tokens.css. */
export const themes = [
  {
    id: "mono",
    name: "Monochrome",
    c: {
      bg: "#0e0e0f",
      surface: "#161618",
      line: "#34343a",
      text: "#e9e9ea",
      dim: "#9a9a9f",
      action: "#e9e9ea",
    },
  },
  {
    id: "blue",
    name: "Electric Blue",
    c: {
      bg: "#090b10",
      surface: "#11141c",
      line: "#232a38",
      text: "#e6eaf2",
      dim: "#8e97aa",
      action: "#4d7cff",
    },
  },
  {
    id: "ember",
    name: "Ink & Ember",
    c: {
      bg: "#0e0d0c",
      surface: "#171513",
      line: "#2e2a26",
      text: "#ede6da",
      dim: "#a49b8e",
      action: "#ff6b3d",
    },
  },
  {
    id: "acid",
    name: "Mono + Acid",
    c: {
      bg: "#0c0c0c",
      surface: "#151515",
      line: "#2c2c2c",
      text: "#f2f2f2",
      dim: "#9c9c9c",
      action: "#d4ff3f",
    },
  },
] as const;

export type Theme = (typeof themes)[number]["id"];
export const DEFAULT_THEME: Theme = "blue";
