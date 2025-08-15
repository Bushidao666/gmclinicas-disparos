import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { fontSans } from "@/config/fonts";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { MainLayout } from "@/components/MainLayout";

export const metadata: Metadata = {
  title: {
    default: "GM Disparos",
    template: `%s - GM Disparos`,
  },
  description: "Sistema de disparos WhatsApp para agências",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <SidebarProvider>
            <div className="relative flex h-screen">
              <Sidebar />
              <MainLayout>{children}</MainLayout>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
