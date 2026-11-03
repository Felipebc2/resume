import type messages from "@/i18n/messages/en.json";

type M = typeof messages.Experience;
/** prose lives under Experience.work.<id>, Experience.lab.<id>, Experience.head and Experience.degree */
export type WorkId = keyof M["work"];
export type LabId = keyof M["lab"];
export type EntryId = WorkId | LabId | "head" | "idp";
export type Place = "rem" | "bsb" | "bue" | "sv";

/** card art: a short label (≤ 6 chars, the same in every locale) or a pictogram, dithered into dots */
export type Art = string | { icon: "globe" };

/** dates are "YYYY-MM"; end undefined = still running */
export type Work = {
  id: WorkId;
  /** --role flag in the htop command line */
  cmd: string;
  start: string;
  end?: string;
  place: Place;
  /** card art label, ≤ 6 chars */
  art: string;
  rank?: number;
  tags: string[];
};

export type Lab = {
  id: LabId;
  type: "competition" | "event" | "role" | "research";
  date: string;
  /** roles and research only; competitions and events are one month */
  end?: string;
  place?: Place;
  art: string;
  rank?: number;
  tags?: string[];
  /** public repo, linked from the card */
  repo?: string;
};

export const work: Work[] = [
  {
    id: "nexara",
    cmd: "head-of-it",
    start: "2026-08",
    place: "bsb",
    art: "HEAD",
    tags: ["AWS", "LLMs", "Multi-agent", "Next.js"],
  },
  {
    id: "mec",
    cmd: "full-stack-developer",
    start: "2026-06",
    place: "bsb",
    art: "MEC",
    tags: ["Django", "PostgreSQL", "HTMX", "BPMN 2.0"],
  },
  {
    id: "jus",
    cmd: "tech-lead-full-stack",
    start: "2026-04",
    end: "2026-06",
    place: "bsb",
    art: "1ST",
    rank: 1,
    tags: ["Next.js", "FastAPI", "Celery", "Ollama"],
  },
  {
    id: "ize",
    cmd: "data-intern",
    start: "2025-10",
    end: "2025-12",
    place: "bsb",
    art: "IZE",
    tags: ["Python", "Airflow", "Selenium", "Power BI"],
  },
  {
    id: "ofc",
    cmd: "it-support-intern",
    start: "2025-05",
    end: "2025-10",
    place: "bsb",
    art: "N1",
    tags: ["Azure", "Docker", "Python"],
  },
];

export const lab: Lab[] = [
  {
    id: "eko",
    type: "competition",
    date: "2026-10",
    place: "bue",
    art: "4TH",
    rank: 4,
    repo: "https://github.com/Felipebc2/Ekoparty2026-CTF",
  },
  { id: "ctfw", type: "event", date: "2026-08", place: "bsb", art: "CTF" },
  { id: "hack3", type: "event", date: "2024-06", place: "bsb", art: "HACK" },
  {
    id: "ta",
    type: "role",
    date: "2026-02",
    end: "2026-06",
    place: "bsb",
    art: "OPS",
    tags: ["Docker", "Docker Compose", "Linux", "CI/CD"],
  },
  {
    id: "ctf6",
    type: "competition",
    date: "2025-10",
    place: "bsb",
    art: "FLAG",
    rank: 4,
    repo: "https://github.com/Felipebc2/MonoRepo-Hackathons/tree/main/Hackathon-CTF",
  },
  {
    id: "cp",
    type: "event",
    date: "2025-08",
    art: "72H",
    tags: ["React Native", "Flask", "MongoDB", "Docker"],
  },
  {
    id: "rob",
    type: "competition",
    date: "2025-08",
    place: "bsb",
    art: "ROB",
    rank: 1,
  },
  {
    id: "fapdf",
    type: "research",
    date: "2025-08",
    end: "2026-06",
    place: "bsb",
    art: "ORBIT",
  },
  {
    id: "idph",
    type: "competition",
    date: "2025-06",
    place: "bsb",
    art: "1ST",
    rank: 1,
  },
  { id: "demo", type: "event", date: "2025-07", place: "bsb", art: "DEMO" },
  { id: "go", type: "event", date: "2024-07", place: "sv", art: "GO" },
  {
    id: "pod",
    type: "role",
    date: "2024-02",
    end: "2024-06",
    place: "bsb",
    art: "REC",
  },
];

export const academic = {
  id: "idp",
  start: "2023-08",
  end: "2027-08",
  semester: 7,
  place: "bsb",
  art: "INIT",
} as const;

/** shelf order; caption and reveal text live under Experience.trophies.<id> */
export const trophies = [
  { id: "eko", glyph: "4" },
  { id: "jus", glyph: "1" },
  { id: "idph", glyph: "1" },
  { id: "rob", glyph: "1" },
  { id: "go", glyph: "GO" },
] as const satisfies { id: WorkId | LabId; glyph: string }[];

/** map pins; "rem" has no pin, it rings Brasília */
export const pins = {
  bsb: { lat: -15.79, lon: -47.88 },
  bue: { lat: -34.6, lon: -58.38 },
  sv: { lat: 37.39, lon: -122.08 },
} as const;

/** entry selected when the section loads */
export const firstEntry: EntryId = "nexara";
