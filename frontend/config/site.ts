export const siteConfig = {
  name: "Akedly",
  nameAr: "أكّدلي",
  contactEmail: "hello@akedly.com",
  navLinks: [
    { id: "product", href: "#product" },
    { id: "howItWorks", href: "#how-it-works" },
    { id: "integrations", href: "#integrations" },
    { id: "pricing", href: "#pricing" },
    { id: "faq", href: "#faq" },
  ] as const,
  social: [
    { id: "twitter", href: "#" },
    { id: "linkedin", href: "#" },
    { id: "instagram", href: "#" },
  ] as const,
};

export type NavLinkId = (typeof siteConfig.navLinks)[number]["id"];
