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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnon) return json({ error: "SUPABASE_URL/ANON não configurados" }, 500);

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { instances } = await req.json();
    if (!Array.isArray(instances)) return json({ error: "instances[] é obrigatório" }, 400);

    const rows = instances.map((it: any) => ({
      client_id: it.client_id,
      base_url: it.base_url ?? null,
      instance_id: it.instance_id,
      api_key: null,
      name: it.name ?? null,
      status: it.status ?? 'unknown',
      max_msgs_per_minute: it.max_msgs_per_minute ?? 20,
    }));

    const { data, error, count } = await supabase
      .from("evoapi_instances")
      .upsert(rows, { onConflict: "client_id,instance_id", count: "exact" })
      .select("id", { count: "exact" });

    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, upserted: count ?? data?.length ?? 0 });
  } catch (error) {
    return json({ error: String(error) }, 400);
  }
});


