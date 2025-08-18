"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import NextLink from "next/link";
import { Button } from "@heroui/button";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Send,
  Inbox,
  Calendar,
  Server,
  Webhook,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clientes",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Leads",
    href: "/leads",
    icon: UserPlus,
  },
  {
    label: "Campanhas",
    href: "/campaigns",
    icon: Send,
  },
  {
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
  {
    label: "Agendamentos",
    href: "/appointments",
    icon: Calendar,
  },
  {
    label: "Instâncias",
    href: "/instances",
    icon: Server,
  },
  {
    label: "Webhooks",
    href: "/webhooks",
    icon: Webhook,
  },
  {
    label: "Equipe",
    href: "/team",
    icon: Shield,
  },
];

export const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const [hasSession, setHasSession] = useState<boolean>(false);
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setHasSession(!!data.session);
    })();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="p-4 border-b border-default-200 bg-gradient-to-r from-primary-50/30 to-transparent">
        <NextLink 
          href="/" 
          className={clsx(
            "flex items-center gap-3 transition-all duration-300 hover:scale-105",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <div className="p-2 bg-primary rounded-lg shadow-md">
            <Logo className="text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
              GM Disparos
            </span>
          )}
        </NextLink>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems
          .filter((i) => (i.href === "/team" ? isAdmin : true))
          .map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <NextLink key={item.href} href={item.href}>
              <Button
                variant={isActive ? "solid" : "light"}
                color={isActive ? "primary" : "default"}
                className={clsx(
                  "w-full group transition-all duration-300",
                  isCollapsed ? "justify-center px-2" : "justify-start",
                  isActive 
                    ? "shadow-md bg-gradient-to-r from-primary to-primary-600 text-white" 
                    : "hover:bg-primary/10 hover:text-primary hover:translate-x-1"
                )}
                startContent={
                  <Icon 
                    size={20} 
                    className={clsx(
                      "transition-all duration-300",
                      isActive ? "text-white" : "text-arsenic-500 group-hover:text-primary"
                    )}
                  />
                }
              >
                {!isCollapsed && (
                  <span className={clsx(
                    "font-medium",
                    isActive ? "text-white" : "text-arsenic-500 group-hover:text-primary"
                  )}>
                    {item.label}
                  </span>
                )}
              </Button>
            </NextLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-default-200 space-y-2">
        {hasSession && (
          <>
            <NextLink href="/settings">
              <Button
                variant="light"
                className={clsx(
                  "w-full group transition-all duration-300 hover:bg-default-100",
                  isCollapsed ? "justify-center px-2" : "justify-start"
                )}
                startContent={<Settings size={20} className="text-arsenic-500 group-hover:text-primary transition-colors duration-300" />}
              >
                {!isCollapsed && <span className="text-arsenic-500 group-hover:text-primary">Configurações</span>}
              </Button>
            </NextLink>
            
            <Button
              variant="light"
              color="danger"
              className={clsx(
                "w-full group transition-all duration-300 hover:bg-danger-50",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
              startContent={<LogOut size={20} className="transition-transform duration-300 group-hover:translate-x-1" />}
              onClick={signOut}
            >
              {!isCollapsed && "Sair"}
            </Button>
          </>
        )}
        
        <div className={clsx(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && <span className="text-sm text-default-500">Tema</span>}
          <ThemeSwitch />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        isIconOnly
        variant="light"
        className="fixed top-4 left-4 z-50 lg:hidden"
        aria-label={isMobileOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsMobileOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Fechar menu"
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={clsx(
        "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-gradient-to-b from-background via-background to-primary-50/5 border-r border-default-200 transition-all duration-300 z-40 shadow-xl",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {sidebarContent}
        
        {/* Collapse Toggle */}
        <Button
          isIconOnly
          size="sm"
          variant="solid"
          className="absolute -right-3 top-20 z-10 bg-primary text-white shadow-lg hover:bg-primary-600 transition-all duration-300 hover:scale-110"
          aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={clsx(
        "lg:hidden flex flex-col fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-background via-background to-primary-50/5 border-r border-default-200 transition-transform duration-300 z-50 shadow-2xl",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
};