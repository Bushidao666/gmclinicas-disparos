import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, role")
      .in("role", ["admin", "collaborator"])
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Buscar permissões de colaboradores
    const ids = (profiles || []).map((p) => p.id);
    const { data: perms } = await supabase
      .from("agency_collaborators")
      .select("user_id, permissions")
      .in("user_id", ids);
    const byId = new Map((perms || []).map((p) => [p.user_id, p.permissions]));

    const result = (profiles || []).map((p) => ({
      ...p,
      permissions: p.role === "collaborator" ? byId.get(p.id) || null : null,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}

