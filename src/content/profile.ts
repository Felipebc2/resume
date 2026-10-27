export const profile = {
  name: "Felipe Barroso",
  handle: "felipebc2",
  city: "Brasília",
  /** orgs whose public repos count toward the repo stat */
  repoOrgs: ["College-IDP"],
  timeZone: "America/Sao_Paulo",
  links: {
    linkedin: "https://www.linkedin.com/in/felipebc2/",
    github: "https://github.com/Felipebc2",
    cv: "/cv/felipe-barroso-en.pdf",
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
