import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const { userId, role, permissions } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: () => undefined, set: () => undefined, remove: () => undefined } }
    );

    if (role) {
      const { error } = await supabase
        .from("user_profiles")
        .update({ role })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (permissions) {
      const { error } = await supabase
        .from("agency_collaborators")
        .upsert({ user_id: userId, permissions }, { onConflict: "user_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}

