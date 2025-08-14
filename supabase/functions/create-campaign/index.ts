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
    const { client_id, name, start_at, daily_volume, target_count, content_type, caption_text, media_path, evoapi_instance_id } = await req.json();
    if (!client_id || !name || !start_at || !daily_volume) {
      return json({ error: "client_id, name, start_at, daily_volume são obrigatórios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnon) return json({ error: "SUPABASE_URL/ANON não configurados" }, 500);

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({ client_id, name, start_at, daily_volume, target_count, content_type, caption_text, media_path, evoapi_instance_id, status: "active" })
      .select("id")
      .single();

    if (error) return json({ error: error.message }, 400);

    const { data: planned, error: errPlan } = await supabase
      .rpc("plan_campaign_targets", { target_campaign_id: campaign.id })
      .single();

    if (errPlan) return json({ error: errPlan.message, campaign_id: campaign.id }, 400);

    return json({ ok: true, campaign_id: campaign.id, targets_created: planned ?? 0 });
  } catch (error) {
    return json({ error: String(error) }, 400);
  }
});


