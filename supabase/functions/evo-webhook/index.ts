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

function detectType(text: string | undefined): { type: "unsubscribe" | "positive" | "other"; matched?: string } {
  const t = (text || "").trim().toLowerCase();
  if (!t) return { type: "other" };
  const unsub = ["sair", "remover", "pare", "stop", "unsubscribe"];
  const positive = ["eu quero", "quero", "sim", "interesse", "interessado", "ok"];
  for (const k of unsub) if (t.includes(k)) return { type: "unsubscribe", matched: k };
  for (const k of positive) if (t.includes(k)) return { type: "positive", matched: k };
  return { type: "other" };
}

Deno.env.get;

function normalizeFromEvo(raw: string | undefined): string | null {
  if (!raw) return null;
  // remove sufixos jid padrão (ex.: @c.us, @s.whatsapp.net)
  const base = raw.replace(/@[^:]+(:.*)?$/, "");
  const digits = base.replace(/\D+/g, "");
  if (digits.length === 0) return null;
  if (base.startsWith("+")) return `+${digits}`;
  // heurística: assume Brasil +55 se não vier com país
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("EVO_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret") || undefined;
  if (expectedSecret && providedSecret !== expectedSecret) return json({ error: "Unauthorized" }, 401);

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRole || !supabaseUrl) return json({ error: "SERVICE_ROLE/URL ausentes" }, 500);
  const supabase = createClient(supabaseUrl, serviceRole);

  try {
    const payload = await req.json().catch(() => ({}));
    const text: string | undefined = payload?.message?.text ?? payload?.text ?? payload?.message ?? undefined;
    const phoneRaw: string | undefined = payload?.from ?? payload?.sender ?? payload?.phone ?? undefined;
    const phoneE164 = normalizeFromEvo(phoneRaw);
    const instanceId: string | undefined = payload?.instanceId ?? payload?.instance_id ?? payload?.instance ?? undefined;

    // Resolve cliente via instanceId
    let evoInstanceId: string | null = null;
    let clientId: string | null = payload?.client_id ?? null;
    if (instanceId) {
      const { data: inst } = await supabase
        .from("evoapi_instances")
        .select("id, client_id")
        .eq("instance_id", instanceId)
        .limit(1);
      if (inst && inst.length > 0) {
        evoInstanceId = inst[0].id;
        if (!clientId) clientId = inst[0].client_id;
      }
    }

    // Persiste evento bruto já com possíveis resoluções
    await supabase.from("webhook_events").insert({
      client_id: clientId,
      evoapi_instance_id: evoInstanceId,
      event_type: payload?.event || payload?.status || "message",
      raw_json: payload,
      signature_valid: expectedSecret ? providedSecret === expectedSecret : true,
    });

    // Se há cliente resolvido e telefone, localiza ou cria lead e registra inbound
    if (clientId && phoneE164) {
      let leadId: string | null = null;
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .eq("client_id", clientId)
        .eq("whatsapp_e164", phoneE164)
        .limit(1);

      if (leads && leads.length > 0) {
        leadId = leads[0].id;
      } else {
        // cria lead mínimo para não perder o vínculo
        const { data: created } = await supabase
          .from("leads")
          .insert({ client_id: clientId, full_name: null, whatsapp_e164: phoneE164 })
          .select("id")
          .single();
        leadId = created?.id ?? null;
      }

      if (leadId) {
        await supabase.from("messages_inbound").insert({ client_id: clientId, lead_id: leadId, text_content: text ?? null, payload_json: payload });

        const detection = detectType(text);
        if (detection.type === "unsubscribe") {
          await supabase.from("responses").insert({ client_id: clientId, lead_id: leadId, type: "unsubscribe", detected_by: "webhook", matched_text: detection.matched ?? null });
          await supabase.from("leads").update({ is_opted_out: true }).eq("id", leadId);
        } else if (detection.type === "positive") {
          await supabase.from("responses").insert({ client_id: clientId, lead_id: leadId, type: "positive", detected_by: "webhook", matched_text: detection.matched ?? null });
          await supabase.from("appointments").insert({ client_id: clientId, lead_id: leadId, status: "pending" });
        }
      }
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: String(error) }, 400);
  }
});


