import type messages from "@/i18n/messages/en.json";

type M = typeof messages.Projects;
/** prose lives under Projects.items.<id> and Projects.labs.<id> */
export type ProjectId = keyof M["items"];
export type LabId = keyof M["labs"];
export type Cat =
  "ai" | "web" | "data" | "mobile" | "science" | "other" | "lab";
export type Filter = "all" | Cat;

export const filters: Filter[] = [
  "all",
  "ai",
  "web",
  "data",
  "mobile",
  "science",
  "other",
  "lab",
];

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
  /** without one, the case draws Client → stack[0..2] */
  bp?: Blueprint;
  /** empty slot waiting for a real project */
  ph?: true;
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
    cat: ["ai", "data"],
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
    cat: ["science"],
    year: "2026",
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
    cat: ["mobile"],
    year: "2025",
    art: "VRT",
    mob: [1, 1],
    stack: ["React Native", "TypeScript"],
    bp: { a: [0, 0], b: [1, 0, "a"], c: [2, 0, "b"], d: [1, 1, "b"] },
  },
  {
    id: "contratus",
    cat: ["ai", "web"],
    year: "2025",
    art: "CTR",
    mob: [1, 1],
    stack: ["FastAPI", "SvelteKit", "Pinecone"],
    bp: { a: [0, 0], b: [1, 0, "a"], c: [2, 0, "b"], d: [1, 1, "b"] },
  },
  {
    id: "airq",
    cat: ["data"],
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
    id: "slot1",
    cat: ["other"],
    year: "—",
    art: "A",
    mob: [1, 1],
    stack: [],
    ph: true,
  },
  {
    id: "slot2",
    cat: ["other"],
    year: "—",
    art: "B",
    mob: [1, 1],
    stack: [],
    ph: true,
  },
  {
    id: "slot3",
    cat: ["other"],
    year: "—",
    art: "C",
    mob: [2, 1],
    stack: [],
    ph: true,
  },
];

/** IDP coursework repos: searchable, not on the bento */
export const labs: { id: LabId; lang: string }[] = [
  { id: "oop", lang: "Java" },
  { id: "techniques", lang: "C++" },
  { id: "ds", lang: "C" },
  { id: "paradigms", lang: "Multi" },
  { id: "db", lang: "SQL" },
  { id: "ml", lang: "Python" },
  { id: "stats", lang: "Python" },
];
