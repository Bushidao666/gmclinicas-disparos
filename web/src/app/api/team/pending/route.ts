import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Verificar admin via sessão
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

    // Usar Service Role para consultar diretamente no banco (mais simples)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Buscar usuários pendentes via SQL direto (mais confiável)
    const { data: pendingUsers, error: pendingErr } = await supabaseAdmin.rpc('get_pending_team_invites');
    
    if (pendingErr) {
      // Se a função não existe, retornar lista vazia por enquanto
      console.error('Função get_pending_team_invites não encontrada:', pendingErr);
      return NextResponse.json([]);
    }

    const result = pendingUsers || [];

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}


