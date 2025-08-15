"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { 
  Home, 
  Send, 
  Phone, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { useUserRole } from "@/hooks/useUserRole";
import { FullPageLoader } from "@/components/FullPageLoader";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { QueryInvalidationProvider } from "@/providers/QueryInvalidationProvider";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const { role, profile, loading: roleLoading, isClient } = useUserRole();
  const [checking, setChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;
      if (!data.session) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [supabase, router]);

  useEffect(() => {
    // Verificar se é cliente e redirecionar se não for
    if (!roleLoading && !isClient) {
      router.replace("/");
    }
  }, [role, roleLoading, isClient, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checking || roleLoading) {
    return <FullPageLoader message="Verificando sessão..." />;
  }

  if (!isClient) {
    return null;
  }

  const navigation = [
    { name: "Início", href: "/client-dashboard", icon: Home },
    { name: "Campanhas", href: "/client-dashboard/campaigns", icon: Send },
    { name: "Números", href: "/client-dashboard/instances", icon: Phone },
    { name: "Relatórios", href: "/client-dashboard/reports", icon: BarChart3 },
  ];

  return (
    <RealtimeProvider>
      <QueryInvalidationProvider>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              className="md:hidden"
              onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <h1 className="text-xl font-semibold">
              {profile?.client?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <Avatar
                name={profile?.full_name || profile?.email}
                size="sm"
              />
              <div className="text-sm">
                <p className="font-medium">{profile?.full_name || "Cliente"}</p>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Button
              color="danger"
              variant="light"
              startContent={<LogOut className="w-4 h-4" />}
              onPress={handleLogout}
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card">
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar Mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setIsMobileMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsMobileMenuOpen(false);
              }}
              role="button"
              tabIndex={0}
              aria-label="Fechar menu"
            />
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r">
              <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
      </QueryInvalidationProvider>
    </RealtimeProvider>
  );
}