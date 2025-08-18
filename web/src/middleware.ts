import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Determinar role do usuário se houver sessão
  let userRole: string | null = null;
  if (session?.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    userRole = profile?.role ?? null;
  }

  // Definições de rotas protegidas
  const adminPaths = [
    "/dashboard",
    "/clients",
    "/leads",
    "/campaigns",
    "/inbox",
    "/appointments",
    "/instances",
    "/webhooks",
    "/settings",
  ];
  const isAdminPath = adminPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  const isClientPath = request.nextUrl.pathname.startsWith("/client-dashboard");

  // Se o usuário estiver logado e tentar acessar a página inicial
  if (session && request.nextUrl.pathname === "/") {
    if (userRole === "client") {
      return NextResponse.redirect(new URL("/client-dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Permitir acesso às rotas de autenticação sem login
  const isAuthPath = request.nextUrl.pathname.startsWith("/auth/");
  
  // Se o usuário não estiver logado e tentar acessar rotas protegidas
  if (!session && (isAdminPath || isClientPath) && !isAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Bloquear clientes em rotas de admin
  if (session && userRole === "client" && isAdminPath) {
    return NextResponse.redirect(new URL("/client-dashboard", request.url));
  }

  // Opcional: evitar que admin/colaborador acesse rotas de cliente
  if (session && userRole !== "client" && isClientPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * - auth routes (handled separately)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
