import type messages from "@/i18n/messages/en.json";

export type Tool = {
  label: string;
  /** file name in public/icons, without extension */
  icon?: string;
  /** text shown instead of an icon */
  text?: string;
};

export type Category = {
  key: keyof typeof messages.Stack.categories;
  /** spans both bento columns */
  full?: boolean;
  tools: Tool[];
};

/** monochrome icons that need inverting on the dark tile */
export const invertedIcons = new Set([
  "rust",
  "solidity",
  "angular",
  "framermotion",
  "flask",
  "apachekafka",
  "linux",
  "selenium",
  "latex",
  "openai",
  "ollama",
  "langchain",
  "ethereum",
]);

const t = (icon: string, label: string): Tool => ({ icon, label });

export const stack: Category[] = [
  {
    key: "languages",
    full: true,
    tools: [
      t("python", "Python"),
      t("typescript", "TypeScript"),
      t("javascript", "JavaScript"),
      t("c", "C"),
      t("cplusplus", "C++"),
      t("rust", "Rust"),
      t("java", "Java"),
      t("csharp", "C#"),
      t("bash", "Bash"),
      t("lua", "Lua"),
      { label: "x86 ASM", text: "asm" },
      t("solidity", "Solidity"),
    ],
  },
  {
    key: "frontend",
    tools: [
      t("nextjs", "Next.js"),
      t("react", "React"),
      t("angular", "Angular"),
      t("tailwindcss", "Tailwind"),
      t("framermotion", "Motion"),
      t("vitejs", "Vite"),
    ],
  },
  {
    key: "backend",
    tools: [
      t("fastapi", "FastAPI"),
      t("nodejs", "Node.js"),
      t("nestjs", "NestJS"),
      t("flask", "Flask"),
      t("pydantic", "Pydantic"),
    ],
  },
  {
    key: "data",
    tools: [
      t("postgresql", "PostgreSQL"),
      t("mongodb", "MongoDB"),
      t("redis", "Redis"),
      t("cassandra", "Cassandra"),
      t("supabase", "Supabase"),
      t("firebase", "Firebase"),
      t("mysql", "MySQL"),
      t("apacheairflow", "Airflow"),
      t("pandas", "pandas"),
    ],
  },
  {
    key: "cloud",
    tools: [
      t("docker", "Docker"),
      t("amazonwebservices", "AWS"),
      t("azure", "Azure"),
      t("apachekafka", "Kafka"),
      t("rabbitmq", "RabbitMQ"),
      t("minio", "MinIO"),
      t("cloudflare", "Cloudflare"),
      t("githubactions", "Actions"),
      t("git", "Git"),
      t("linux", "Linux"),
    ],
  },
  {
    key: "ai",
    tools: [
      t("claude", "Claude"),
      t("openai", "OpenAI"),
      t("ollama", "Ollama"),
      t("huggingface", "Hugging Face"),
      t("langchain", "LangChain"),
      t("n8n", "n8n"),
      t("pytorch", "PyTorch"),
      t("scikitlearn", "scikit-learn"),
      t("jupyter", "Jupyter"),
    ],
  },
  {
    key: "security",
    tools: [
      t("kalilinux", "Kali"),
      t("wireshark", "Wireshark"),
      t("burpsuite", "Burp Suite"),
      t("qemu", "QEMU"),
      { label: "Ghidra", text: "GH" },
      { label: "GDB", text: "gdb" },
      { label: "pwntools", text: "pwn" },
      t("ethereum", "Web3 / EVM"),
    ],
  },
  {
    key: "quality",
    tools: [
      t("pytest", "Pytest"),
      t("playwright", "Playwright"),
      t("selenium", "Selenium"),
      t("sonarqube", "SonarQube"),
      t("cucumber", "Cucumber"),
      t("postman", "Postman"),
      t("figma", "Figma"),
      t("latex", "LaTeX"),
      t("obsidian", "Obsidian"),
    ],
  },
  {
    key: "os",
    tools: [
      t("archlinux", "Arch"),
      t("hyprland", "Hyprland"),
      t("ubuntu", "Ubuntu"),
      t("linuxmint", "Mint"),
      t("neovim", "Neovim"),
      t("raspberrypi", "Raspberry Pi"),
      t("arduino", "Arduino"),
      t("blender", "Blender"),
    ],
  },
];
