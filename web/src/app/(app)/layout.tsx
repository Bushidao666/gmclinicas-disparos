"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [checking, setChecking] = useState(true);

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

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-default-600">Verificando sessão...</div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-neutral-50">{children}</div>
    </RealtimeProvider>
  );
}
