import type messages from "@/i18n/messages/en.json";

type M = typeof messages.Experience;
/** prose lives under Experience.work.<id>, Experience.lab.<id>, Experience.head and Experience.degree */
export type WorkId = keyof M["work"];
export type LabId = keyof M["lab"];
export type EntryId = WorkId | LabId | "head" | "idp";
export type Place = "rem" | "bsb" | "bue" | "sv";

/** dates are "YYYY-MM"; end undefined = still running */
export type Work = {
  id: WorkId;
  /** --role flag in the htop command line */
  cmd: string;
  start: string;
  end?: string;
  place: Place;
  /** text dithered into the card art */
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
};

export const work: Work[] = [
  {
    id: "nexai",
    cmd: "software-architect-tech-lead",
    start: "2026-08",
    place: "rem",
    art: "NX",
    tags: ["AWS", "LLMs", "ADRs", "Multi-agent"],
  },
  {
    id: "nexara",
    cmd: "head-of-it",
    start: "2026-08",
    place: "bsb",
    art: "NXR",
    tags: ["Next.js", "React", "Motion", "i18n"],
  },
  {
    id: "mec",
    cmd: "full-stack-developer",
    start: "2026-06",
    place: "bsb",
    art: "MEC",
    tags: ["KPIs", "Jurimetrics", "BPMN 2.0"],
  },
  {
    id: "jus",
    cmd: "tech-lead-full-stack",
    start: "2026-04",
    end: "2026-06",
    place: "bsb",
    art: "JUS",
    rank: 1,
    tags: ["FastAPI", "PostgreSQL", "Docker", "S3"],
  },
  {
    id: "ize",
    cmd: "data-intern",
    start: "2025-10",
    end: "2025-12",
    place: "bsb",
    art: "IZE",
    tags: ["Airflow", "Selenium", "PostgreSQL"],
  },
  {
    id: "ofc",
    cmd: "it-support-intern",
    start: "2025-05",
    end: "2025-10",
    place: "bsb",
    art: "OFC",
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
  },
  { id: "ctfw", type: "event", date: "2026-08", place: "bsb", art: "WS" },
  { id: "hack3", type: "event", date: "2026-03", place: "bsb", art: "HCK" },
  {
    id: "ta",
    type: "role",
    date: "2026-02",
    end: "2026-06",
    place: "bsb",
    art: "TA",
  },
  { id: "ctf6", type: "competition", date: "2025-10", art: "CTF" },
  { id: "cp", type: "event", date: "2025-08", art: "CP" },
  {
    id: "rob",
    type: "competition",
    date: "2025-08",
    place: "bsb",
    art: "1ST",
    rank: 1,
  },
  {
    id: "fapdf",
    type: "research",
    date: "2025-08",
    end: "2026-06",
    place: "bsb",
    art: "FAP",
  },
  {
    id: "idph",
    type: "competition",
    date: "2025-06",
    place: "bsb",
    art: "1ST",
    rank: 1,
  },
  { id: "demo", type: "event", date: "2025-05", place: "bsb", art: "DD" },
  { id: "sprint7", type: "event", date: "2025-03", place: "bsb", art: "144" },
  { id: "go", type: "event", date: "2024-07", place: "sv", art: "GO" },
  {
    id: "pod",
    type: "role",
    date: "2024-02",
    end: "2024-06",
    place: "bsb",
    art: "POD",
  },
];

export const academic = {
  id: "idp",
  start: "2023-08",
  end: "2027-08",
  semester: 7,
  place: "bsb",
  art: "IDP",
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
export const firstEntry: EntryId = "nexai";
