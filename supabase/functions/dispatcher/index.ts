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

async function sendText({ baseUrl, apiKey, instanceId, to, message }: { baseUrl: string; apiKey: string; instanceId: string; to: string; message: string }) {
  const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instanceId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey,  // Mudança: usar 'apikey' ao invés de 'x-api-key'
    },
    body: JSON.stringify({ 
      number: to,      // Mudança: usar 'number' ao invés de 'to'
      text: message    // Mudança: usar 'text' ao invés de 'message'
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }
  return body;
}

async function sendMedia({ baseUrl, apiKey, instanceId, to, fileUrl, caption }: { baseUrl: string; apiKey: string; instanceId: string; to: string; fileUrl: string; caption?: string }) {
  const url = `${baseUrl.replace(/\/$/, "")}/message/sendMedia/${encodeURIComponent(instanceId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey,  // Mudança: usar 'apikey' ao invés de 'x-api-key'
    },
    body: JSON.stringify({ 
      number: to,        // Mudança: usar 'number' ao invés de 'to'
      media: fileUrl,    // Mudança: usar 'media' ao invés de 'fileUrl'
      caption: caption
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }
  return body;
}

Deno.serve(async (_req: Request) => {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRole || !supabaseUrl) return json({ error: "SERVICE_ROLE/URL ausentes" }, 500);

  const evoBase = Deno.env.get("EVO_BASE_URL") || "https://api.automacoesgm.com.br/manager";
  const evoKey = Deno.env.get("EVO_API_KEY");
  if (!evoKey) return json({ error: "EVO_API_KEY ausente" }, 500);

  const supabase = createClient(supabaseUrl, serviceRole);

  // Reivindica um pequeno lote
  const { data: targets, error: errClaim } = await supabase.rpc("claim_campaign_targets", { batch_size: 20 });
  if (errClaim) return json({ error: errClaim.message }, 500);
  if (!targets || targets.length === 0) return json({ ok: true, dispatched: 0 });

  let sentCount = 0;
  const errors: Array<{ target_id: string; error: string }> = [];

  for (const t of targets as any[]) {
    const instanceId = t.instance_id;
    const baseUrl = t.instance_base_url || evoBase;
    try {
      let responseBody: any = null;
      if (t.content_type === "text" || !t.media_path) {
        responseBody = await sendText({ baseUrl, apiKey: evoKey, instanceId, to: t.phone, message: t.caption_text ?? "" });
      } else {
        // Gera Signed URL se media_path não for URL absoluta
        let fileUrl = String(t.media_path);
        if (!/^https?:\/\//i.test(fileUrl)) {
          // Suporta formato "media:path/arquivo" ou apenas "path/arquivo"
          const path = fileUrl.replace(/^media:\\/i, "");
          const { data: signed, error: signErr } = await supabase.storage
            .from("media")
            .createSignedUrl(path, 60 * 60); // 1h
          if (signErr || !signed?.signedUrl) throw new Error(`Falha ao assinar mídia: ${signErr?.message ?? "desconhecido"}`);
          fileUrl = signed.signedUrl;
        }
        responseBody = await sendMedia({ baseUrl, apiKey: evoKey, instanceId, to: t.phone, fileUrl, caption: t.caption_text ?? undefined });
      }

      const evoMessageId = responseBody?.messageId || responseBody?.id || null;
      await supabase.rpc("complete_target_sent", { p_target_id: t.target_id, p_evo_message_id: evoMessageId, p_payload: responseBody ?? {} });
      sentCount += 1;
    } catch (e) {
      errors.push({ target_id: t.target_id, error: String(e) });
      await supabase.rpc("complete_target_failed", { p_target_id: t.target_id, p_error: String(e) });
    }
  }

  return json({ ok: true, dispatched: sentCount, failures: errors });
});


