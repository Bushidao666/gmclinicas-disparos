import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const evoBase = Deno.env.get("EVO_BASE_URL");
    const evoKey = Deno.env.get("EVO_API_KEY");

    console.log("Debug - Secrets check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnon: !!supabaseAnon,
      hasEvoBase: !!evoBase,
      hasEvoKey: !!evoKey,
      evoBase: evoBase?.substring(0, 20) + "...",
    });

    if (!supabaseUrl || !supabaseAnon)
      return json({ error: "SUPABASE_URL/ANON ausentes" }, 500);
    if (!serviceRole) return json({ error: "SERVICE_ROLE ausente" }, 500);
    if (!evoBase || !evoKey)
      return json({ error: "EVO_BASE_URL/EVO_API_KEY ausentes" }, 500);

    // Usa SERVICE ROLE para escrever ignorando RLS (inserção administrativa)
    const supabase = createClient(supabaseUrl, serviceRole);

    const base = evoBase.replace(/\/$/, "");
    const fetchUrl = `${base}/instance/fetchInstances`;

    console.log("Debug - Fazendo fetch para:", fetchUrl);

    const evoRes = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        apikey: evoKey,
        "Content-Type": "application/json",
        "User-Agent": "Supabase-Edge-Functions/1.0",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    console.log("Debug - Response da EVO API:", {
      status: evoRes.status,
      statusText: evoRes.statusText,
      ok: evoRes.ok,
    });

    if (!evoRes.ok) {
      const text = await evoRes.text().catch(() => "");

      console.log("Debug - Response body (erro):", text);

      return json({ error: `EVO fetch falhou: ${evoRes.status} ${text}` }, 502);
    }

    // Primeiro vamos pegar o texto bruto para ver o que realmente vem
    const responseText = await evoRes.text();

    console.log("Debug - Response TEXT RAW:", responseText);
    console.log(
      "Debug - Response Headers:",
      Object.fromEntries(evoRes.headers.entries()),
    );

    let evoJson;

    try {
      evoJson = JSON.parse(responseText);
      console.log("Debug - Parsed JSON:", evoJson);
    } catch (e) {
      console.log("Debug - Erro ao parsear JSON:", String(e));

      return json(
        {
          error: `Resposta não é JSON válido: ${responseText.substring(0, 200)}...`,
        },
        502,
      );
    }

    // Normaliza diferentes formatos possíveis
    let instances: any[] = [];

    if (Array.isArray(evoJson)) {
      instances = evoJson
        .map((item: any) => item?.instance ?? item)
        .filter((it: any) => it && (it.id || it.instanceId || it.instanceName));
    } else if (evoJson && typeof evoJson === "object") {
      const arr = Array.isArray((evoJson as any).instances)
        ? (evoJson as any).instances
        : Array.isArray((evoJson as any).data)
          ? (evoJson as any).data
          : [];

      instances = arr
        .map((item: any) => item?.instance ?? item)
        .filter((it: any) => it && (it.id || it.instanceId || it.instanceName));
    }

    console.log("Debug - Instances normalizadas:", instances);

    // Garantir um cliente "Sem Vínculo (Evo)" para cumprir NOT NULL de client_id
    const { data: agencyRow, error: agencyErr } = await supabase
      .from("agencies")
      .select("id")
      .limit(1)
      .single();

    if (agencyErr || !agencyRow?.id)
      return json(
        { error: `Agência não encontrada: ${agencyErr?.message}` },
        500,
      );

    let defaultClientId: string | null = null;
    const { data: foundClient } = await supabase
      .from("clients")
      .select("id")
      .eq("agency_id", agencyRow.id)
      .ilike("name", "Sem Vínculo (Evo)%")
      .limit(1)
      .maybeSingle();

    if (foundClient?.id) {
      defaultClientId = foundClient.id;
    } else {
      const { data: createdClient, error: createClientErr } = await supabase
        .from("clients")
        .insert({ agency_id: agencyRow.id, name: "Sem Vínculo (Evo)" })
        .select("id")
        .single();

      if (createClientErr || !createdClient?.id)
        return json(
          {
            error: `Falha ao criar cliente padrão: ${createClientErr?.message}`,
          },
          500,
        );
      defaultClientId = createdClient.id;
    }

    const rows = instances.map((inst: any) => ({
      client_id: defaultClientId!,
      base_url: inst.serverUrl ?? evoBase,
      instance_id: inst.instanceId ?? inst.id ?? inst.instanceName,
      name: inst.instanceName ?? inst.name ?? inst.profileName ?? null,
      status: inst.status ?? inst.connectionStatus ?? "unknown",
      max_msgs_per_minute: 20, // padrão
      api_key: "central-manager",
      last_connected_at: inst.updatedAt ?? inst.createdAt ?? null,
    }));

    console.log(
      `Debug - Processamos ${instances.length} instances da API, resultando em ${rows.length} rows`,
    );

    if (rows.length === 0)
      return json({
        ok: true,
        upserted: 0,
        debug: { itemsFromApi: instances.length, processedRows: rows.length },
      });

    const { data, error, count } = await supabase
      .from("evoapi_instances")
      .upsert(rows, { onConflict: "instance_id", count: "exact" })
      .select("id", { count: "exact" });

    if (error) {
      console.log("Debug - DB upsert error:", error);

      return json({ error: error.message }, 400);
    }

    return json({
      ok: true,
      upserted: count ?? data?.length ?? 0,
      debug: { itemsFromApi: instances.length, processedRows: rows.length },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
