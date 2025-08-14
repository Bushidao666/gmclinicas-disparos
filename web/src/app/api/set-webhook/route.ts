import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    
    if (!instanceName) {
      return NextResponse.json(
        { error: "instanceName é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Chamar a edge function set-evo-webhook
    const { data, error } = await supabase.functions.invoke("set-evo-webhook", {
      body: { instanceName },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}