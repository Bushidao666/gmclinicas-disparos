export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "GM Disparos",
  description: "Sistema de disparos WhatsApp para agências",
  navItems: [
    {
      label: "Dashboard",
      href: "/",
    },
    {
      label: "Clientes",
      href: "/clients",
    },
    {
      label: "Leads",
      href: "/leads",
    },
    {
      label: "Campanhas",
      href: "/campaigns",
    },
    {
      label: "Inbox",
      href: "/inbox",
    },
    {
      label: "Agendamentos",
      href: "/appointments",
    },
    {
      label: "Instâncias",
      href: "/instances",
    },
    {
      label: "Webhooks",
      href: "/webhooks",
    },
  ],
  navMenuItems: [
    {
      label: "Dashboard",
      href: "/",
    },
    {
      label: "Clientes",
      href: "/clients",
    },
    {
      label: "Leads",
      href: "/leads",
    },
    {
      label: "Campanhas",
      href: "/campaigns",
    },
    {
      label: "Inbox",
      href: "/inbox",
    },
    {
      label: "Instâncias",
      href: "/instances",
    },
    {
      label: "Webhooks",
      href: "/webhooks",
    },
  ],
  links: {
    github: "https://github.com",
    twitter: "https://twitter.com",
    docs: "https://docs.supabase.com",
    discord: "https://discord.gg",
    sponsor: "https://github.com/sponsors",
  },
};
