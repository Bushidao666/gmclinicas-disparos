import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface ApplyWeekdaysBody {
  weekdays: number[]; // 0=Dom .. 6=Sáb (Date.getDay)
  start_at?: string;
  daily_volume?: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await req.json()) as ApplyWeekdaysBody;
    const weekdays = Array.isArray(body.weekdays) ? body.weekdays : [];
    if (!weekdays.length || weekdays.some((d) => d < 0 || d > 6)) {
      return NextResponse.json(
        { error: "'weekdays' deve conter valores entre 0 e 6" },
        { status: 400 },
      );
    }

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

    const { id: campaignId } = await params;

    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, start_at, daily_volume")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: campaignError?.message || "Campanha não encontrada" },
        { status: 404 },
      );
    }

    const startAt = new Date(body.start_at ?? campaign.start_at);
    const dailyVolume = Number(body.daily_volume ?? campaign.daily_volume);
    if (!Number.isFinite(dailyVolume) || dailyVolume <= 0) {
      return NextResponse.json(
        { error: "daily_volume inválido" },
        { status: 400 },
      );
    }

    // Buscar targets pendentes
    const { data: targets, error: targetsError } = await supabase
      .from("campaign_targets")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("status", "queued")
      .order("created_at", { ascending: true });

    if (targetsError) {
      return NextResponse.json(
        { error: targetsError.message },
        { status: 400 },
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    // Utilitários de data
    const allowed = new Set(weekdays);

    function findNextAllowedDate(base: Date): Date {
      const d = new Date(base);
      for (let i = 0; i < 14; i++) {
        if (allowed.has(d.getDay())) return d;
        d.setDate(d.getDate() + 1);
      }
      return d;
    }

    // Agendar: distribuir por 'dailyVolume' por dia permitido, iniciando em startAt
    let currentDayStart = findNextAllowedDate(startAt);
    currentDayStart.setSeconds(0, 0);
    let dailyAssigned = 0;

    const updates: { id: string; scheduled_at: string }[] = [];
    for (const t of targets) {
      if (dailyAssigned >= dailyVolume) {
        // próximo dia permitido
        const next = new Date(currentDayStart);
        next.setDate(next.getDate() + 1);
        currentDayStart = findNextAllowedDate(next);
        currentDayStart.setSeconds(0, 0);
        dailyAssigned = 0;
      }

      // Agendar com espaçamento de 1 min por mensagem
      const scheduled = new Date(currentDayStart);
      scheduled.setMinutes(scheduled.getMinutes() + dailyAssigned);
      updates.push({ id: t.id, scheduled_at: scheduled.toISOString() });
      dailyAssigned += 1;
    }

    // Upsert em lotes para atualizar scheduled_at
    const chunkSize = 500;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from("campaign_targets")
        .upsert(chunk, { onConflict: "id" });
      if (upsertError) {
        return NextResponse.json(
          { error: `Falha ao atualizar agendamentos: ${upsertError.message}` },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


