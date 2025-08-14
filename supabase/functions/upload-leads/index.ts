import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

function normalizeE164(raw: string): string {
  const digits = (raw || "").replace(/\D+/g, "");
  if (digits.startsWith("+") || raw.startsWith("+")) return raw;
  // Heurística simples: se começar com 55 (Brasil) mantém; senão, assume Brasil 55
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Use application/json" }, 415);
    }

    const { client_id, leads } = await req.json();
    if (!client_id || !Array.isArray(leads)) {
      return json({ error: "client_id e leads[] são obrigatórios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: "SUPABASE_URL/SERVICE_ROLE_KEY não configurados" }, 500);
    }

    // Usar SERVICE_ROLE_KEY para bypass do RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rows = leads
      .filter((l: any) => l && (l.whatsapp || l.whatsapp_e164))
      .map((l: any) => ({
        client_id,
        full_name: l.full_name ?? l.name ?? null,
        whatsapp_e164: normalizeE164(l.whatsapp_e164 ?? l.whatsapp),
        tags: Array.isArray(l.tags) ? l.tags : [],
      }));

    if (rows.length === 0) return json({ ok: true, client_id, received: 0, upserted: 0 });

    const { data, error, count } = await supabase
      .from("leads")
      .upsert(rows, { onConflict: "client_id,whatsapp_e164", count: "exact" })
      .select("id", { count: "exact" });

    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, client_id, received: leads.length, upserted: count ?? data?.length ?? 0 });
  } catch (error) {
    return json({ error: String(error) }, 400);
  }
});


