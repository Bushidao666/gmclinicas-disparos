import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, permissions } = body as {
      email: string;
      role: "admin" | "collaborator";
      permissions?: { manage_clients?: boolean; manage_campaigns?: boolean; view_all_metrics?: boolean };
    };

    const normalizedEmail = (email ?? "").trim().toLowerCase();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!normalizedEmail || !role) {
      return NextResponse.json({ error: "Email e role são obrigatórios" }, { status: 400 });
    }
    if (!emailValid) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // Verificar se quem chama é admin (via sessão)
    const cookieStore = await cookies();
    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => cookieStore.set({ name, value, ...options }),
          remove: (name: string, options: any) => cookieStore.set({ name, value: "", ...options }),
        },
      }
    );
    const { data: { user } } = await supabaseSession.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { data: me } = await supabaseSession.from("user_profiles").select("role").eq("id", user.id).single();
    if (me?.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Configuração ausente: SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Usar fluxo normal de signup (mais simples e confiável)
    // Determinar URL de redirecionamento segura a partir do request
    const hdrs = headers();
    const xfProto = hdrs.get("x-forwarded-proto") || "https";
    const xfHost = hdrs.get("x-forwarded-host") || hdrs.get("host");
    const inferredOrigin = xfHost ? `${xfProto}://${xfHost}` : null;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || inferredOrigin || "")
      .replace(/\/$/, "");

    const nextPath = `/auth/setup-password?type=team-invite&role=${role}`;
    const redirectUrl = siteUrl
      ? `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}`
      : undefined;

    const { data: authRes, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: Math.random().toString(36).slice(-12), // senha temporária aleatória
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: role,
          invited_by_admin: true,
          full_name: normalizedEmail.split('@')[0] // nome padrão baseado no email
        }
      }
    });
    
    if (authError) {
      // Mensagem mais amigável para URL não permitida
      const msg = authError.message?.includes("allow-list")
        ? "URL de redirecionamento não permitida no Supabase Auth. Adicione o domínio do site em Authentication → URL Configuration → Redirect URLs."
        : authError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = authRes?.user?.id;
    if (!userId) return NextResponse.json({ error: "Falha ao criar usuário" }, { status: 400 });

    // O trigger handle_new_user já vai criar o user_profiles automaticamente
    // Só precisamos atualizar as permissões se for colaborador
    if (role === "collaborator") {
      const { error: collabError } = await supabase
        .from("agency_collaborators")
        .upsert({ user_id: userId, permissions: permissions ?? { manage_clients: true, manage_campaigns: true, view_all_metrics: true } }, { onConflict: "user_id" });
      if (collabError) return NextResponse.json({ error: collabError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}

