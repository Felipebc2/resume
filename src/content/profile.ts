export const profile = {
  name: "Felipe Barroso",
  /** public name for search and sharing (title, Open Graph, JSON-LD) */
  seo: {
    name: "Felipe Castro",
    alternateName: "Felipebc2",
    jobTitle: "Full-Stack Engineer",
    knowsAbout: [
      "Next.js",
      "FastAPI",
      "PostgreSQL",
      "Docker",
      "Clean Architecture",
    ],
    country: "BR",
  },
  handle: "felipebc2",
  city: "Brasília",
  /** orgs whose public repos count toward the repo stat */
  repoOrgs: ["College-IDP"],
  timeZone: "America/Sao_Paulo",
  links: {
    linkedin: "https://www.linkedin.com/in/felipebc2/",
    github: "https://github.com/Felipebc2",
    cv: "/cv/felipe-barroso-en.pdf",
    source: "https://github.com/Felipebc2/resume",
  },
  contacts: {
    phone: { href: "tel:+5561999691134", title: "+55 61 99969-1134" },
    whatsapp: { href: "https://wa.me/5561999691134", title: "WhatsApp" },
    email: {
      href: "mailto:felipeb.castro02@gmail.com",
      title: "felipeb.castro02@gmail.com",
    },
  },
} as const;
