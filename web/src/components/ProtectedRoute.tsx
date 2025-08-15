"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";

import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "client" | "collaborator")[];
  redirectTo?: string;
  loadingMessage?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = ["admin", "collaborator"],
  redirectTo = "/",
  loadingMessage = "Verificando permissões..."
}: ProtectedRouteProps) {
  const router = useRouter();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (!loading && role && !allowedRoles.includes(role)) {
      // Redirecionar baseado no role
      if (role === "client") {
        router.replace("/client-dashboard");
      } else {
        router.replace(redirectTo);
      }
    }
  }, [role, loading, allowedRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-default-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Se não tem role ou não está na lista permitida, não renderizar
  if (!role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}