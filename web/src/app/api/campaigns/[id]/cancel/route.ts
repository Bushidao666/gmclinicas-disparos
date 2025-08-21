import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const campaignId = params.id;
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "canceled" })
      .eq("id", campaignId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Cancelar targets pendentes
    const { error: targetsError } = await supabase
      .from("campaign_targets")
      .update({ status: "canceled" })
      .eq("campaign_id", campaignId)
      .in("status", ["queued", "sending"]);

    if (targetsError) {
      // Ainda retornamos 200 para o status da campanha, mas informamos o detalhe
      return NextResponse.json(
        { ok: true, warning: `Campanha cancelada, mas houve erro ao atualizar targets: ${targetsError.message}` },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

