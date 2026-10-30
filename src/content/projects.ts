import type messages from "@/i18n/messages/en.json";

type M = typeof messages.Projects;
/** prose lives under Projects.items.<id> and Projects.labs.<id> */
export type ProjectId = keyof M["items"];
export type LabId = keyof M["labs"];
export const filters = [
  "all",
  "ai",
  "web",
  "data",
  "mobile",
  "science",
  "acad",
  "security",
  "systems",
  "lab",
] as const;
export type Filter = (typeof filters)[number];
export type Cat = Exclude<Filter, "all">;

/** node id → [column, row, parent]. Every node has at most one incoming edge, drawn from its parent. */
export type Blueprint = Record<
  string,
  [col: number, row: 0 | 1, from?: string]
>;

export type Project = {
  id: ProjectId;
  cat: Cat[];
  year: string;
  /** big word on the cover */
  art: string;
  media?: "video" | "image";
  /** [columns, rows] spanned in the 2-column phone grid */
  mob: [number, number];
  stack: string[];
  bp: Blueprint;
};

/** bento order; desktop placement lives in grid-template-areas (Projects.module.css) */
export const projects: Project[] = [
  {
    id: "normai",
    cat: ["ai", "web"],
    year: "2026",
    art: "NORM",
    media: "video",
    mob: [2, 3],
    stack: ["Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
    bp: {
      u: [0, 0],
      fe: [1, 0, "u"],
      api: [2, 0, "fe"],
      db: [3, 0, "api"],
      ai: [2, 1, "api"],
    },
  },
  {
    id: "oficina",
    cat: ["ai", "data", "acad"],
    year: "2025",
    art: "RAG",
    media: "image",
    mob: [1, 2],
    stack: ["n8n", "Supabase", "pgvector", "Ollama"],
    bp: {
      u: [0, 0],
      n8n: [1, 0, "u"],
      vec: [2, 0, "n8n"],
      llm: [3, 0, "vec"],
      auth: [1, 1, "n8n"],
    },
  },
  {
    id: "fluxo",
    cat: ["web"],
    year: "2026",
    art: "FLOW",
    media: "image",
    mob: [1, 2],
    stack: ["Next.js", "React", "TypeScript"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      v: [1, 1, "b"],
    },
  },
  {
    id: "sharebite",
    cat: ["ai", "web"],
    year: "2025",
    art: "SB",
    media: "image",
    mob: [2, 2],
    stack: ["Flask", "MongoDB", "Streamlit"],
    bp: {
      u: [0, 0],
      api: [1, 0, "u"],
      db: [2, 0, "api"],
      rep: [3, 0, "db"],
      ai: [1, 1, "api"],
    },
  },
  {
    id: "orbitas",
    cat: ["science", "acad"],
    year: "2025",
    art: "ƒ(t)",
    media: "video",
    mob: [1, 2],
    stack: ["Python", "NumPy", "Matplotlib"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [2, 1, "c"],
    },
  },
  {
    id: "veritas",
    cat: ["mobile", "acad"],
    year: "2025",
    art: "VRT",
    mob: [1, 1],
    stack: ["React Native", "TypeScript"],
    bp: { a: [0, 0], b: [1, 0, "a"], c: [2, 0, "b"], d: [1, 1, "b"] },
  },
  {
    id: "contratus",
    cat: ["ai", "web", "acad"],
    year: "2025",
    art: "CTR",
    mob: [1, 1],
    stack: ["FastAPI", "SvelteKit", "Pinecone"],
    bp: { a: [0, 0], b: [1, 0, "a"], c: [2, 0, "b"], d: [1, 1, "b"] },
  },
  {
    id: "airq",
    cat: ["data", "acad"],
    year: "2025",
    art: "AQI",
    mob: [2, 1],
    stack: ["Kafka", "Celery", "Redis", "MinIO"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [2, 1, "c"],
    },
  },
  {
    id: "stsw",
    cat: ["security"],
    year: "2026",
    art: "QA",
    mob: [2, 1],
    stack: ["Java", "JUnit", "Cucumber", "TestNG", "JaCoCo", "Maven"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [0, 1, "a"],
    },
  },
  {
    id: "ekoparty",
    cat: ["security"],
    year: "2026",
    art: "CTF",
    mob: [1, 2],
    stack: ["Web3", "Solidity", "Python"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [1, 1, "b"],
    },
  },
  {
    id: "kernel",
    cat: ["systems", "acad"],
    year: "2026",
    art: "BOOT",
    mob: [1, 1],
    stack: ["C", "x86 Assembly", "Linux", "QEMU", "BusyBox"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [2, 1, "c"],
    },
  },
  {
    id: "sqlmap",
    cat: ["security"],
    year: "2026",
    art: "SQLi",
    mob: [1, 1],
    stack: ["SQLMap", "Docker", "Flask", "Next.js", "Make"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [3, 1, "d"],
    },
  },
  {
    id: "tedax",
    cat: ["systems"],
    year: "2025",
    art: "BOOM",
    mob: [2, 1],
    stack: ["C", "pthreads", "ncurses", "SDL2"],
    bp: {
      a: [0, 0],
      b: [1, 0, "a"],
      c: [2, 0, "b"],
      d: [3, 0, "c"],
      e: [3, 1, "d"],
    },
  },
];

/** IDP coursework repos: searchable, not on the bento */
export const labs: { id: LabId; lang: string; year: string }[] = [
  { id: "algo", lang: "C", year: "2023" },
  { id: "ds", lang: "C", year: "2024" },
  { id: "stats", lang: "Python", year: "2024" },
  { id: "db", lang: "SQL", year: "2024" },
  { id: "sdp", lang: "Docs", year: "2024" },
  { id: "ml", lang: "Python", year: "2024" },
  { id: "oop", lang: "Java", year: "2024" },
  { id: "techniques", lang: "C++", year: "2024" },
  { id: "paradigms", lang: "Multi", year: "2026" },
];
