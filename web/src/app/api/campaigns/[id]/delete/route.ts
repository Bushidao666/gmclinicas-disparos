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

    // Garantir que a campanha esteja em estado deletável
    const { data: campaign, error: fetchError } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: fetchError?.message || "Campanha não encontrada" },
        { status: 404 },
      );
    }

    if (!["draft", "canceled"].includes(String(campaign.status))) {
      return NextResponse.json(
        { error: "Só é possível excluir campanhas em rascunho ou canceladas." },
        { status: 400 },
      );
    }

    // Remover dependências
    await supabase.from("campaign_targets").delete().eq("campaign_id", campaignId);
    await supabase.from("messages_outbound").delete().eq("campaign_id", campaignId);

    // Excluir campanha
    const { error: delError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

