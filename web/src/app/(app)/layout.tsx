"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { MainLayout } from "@/components/MainLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [checking, setChecking] = useState(true);
  const { role, loading: roleLoading, isClient } = useUserRole();

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
  }, []);

  useEffect(() => {
    // Proteger rotas admin - redirecionar clientes
    if (!roleLoading && isClient) {
      router.replace("/client-dashboard");
    }
  }, [role, roleLoading, isClient, router]);

  if (checking || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-default-600">Verificando sessão...</div>
      </div>
    );
  }

  // Não mostrar nada para clientes (eles serão redirecionados)
  if (isClient) {
    return null;
  }

  return (
    <RealtimeProvider>
      <SidebarProvider>
        <div className="relative flex h-screen">
          <Sidebar />
          <MainLayout>{children}</MainLayout>
        </div>
      </SidebarProvider>
    </RealtimeProvider>
  );
}
