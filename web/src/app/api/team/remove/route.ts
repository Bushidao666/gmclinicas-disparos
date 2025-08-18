import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    // Verificar se usuário autenticado é admin
    const cookieStore = await cookies();
    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: any) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabaseSession.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { data: me } = await supabaseSession
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (me?.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    // PROTEÇÃO: Impedir que admin remova a si mesmo
    if (userId === user.id) {
      return NextResponse.json({ error: "Você não pode remover sua própria conta" }, { status: 400 });
    }

    // Usar Service Role para remover usuário
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. Remover das tabelas relacionadas primeiro (CASCADE deve cuidar disso, mas vamos garantir)
    await supabaseAdmin.from("agency_collaborators").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_profiles").delete().eq("id", userId);

    // 2. Remover do auth.users (isso remove completamente o usuário)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}
