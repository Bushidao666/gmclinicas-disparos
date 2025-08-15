import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, permissions } = body as {
      email: string;
      role: "admin" | "collaborator";
      permissions?: { manage_clients?: boolean; manage_campaigns?: boolean; view_all_metrics?: boolean };
    };

    if (!email || !role) {
      return NextResponse.json({ error: "Email e role são obrigatórios" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Cria usuário convidado (email recebe link padrão do Supabase)
    const { data: authRes, error: authError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const userId = authRes?.user?.id;
    if (!userId) return NextResponse.json({ error: "Falha ao criar convite" }, { status: 400 });

    // Define role em user_profiles
    const { error: upsertProfileError } = await supabase
      .from("user_profiles")
      .upsert({ id: userId, email, role }, { onConflict: "id" });
    if (upsertProfileError) return NextResponse.json({ error: upsertProfileError.message }, { status: 400 });

    // Se colaborador, registra/atualiza permissões em agency_collaborators
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

