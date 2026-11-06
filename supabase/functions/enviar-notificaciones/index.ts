import { senderStatus } from "../_shared/resend.ts";
import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders, json, getServiceKey, serve } from "../_shared/http.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c] ?? c);
}

async function sendResend(row: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o RESEND_FROM_EMAIL");
  const to = String(row.destinatario ?? "").trim();
  if (!to || !to.includes("@")) throw new Error("Destinatario de correo no válido");
  const subject = String(row.asunto ?? "Notificación de reclamo ciudadano");
  const text = String(row.cuerpo ?? "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": "reclamos/" + String(row.id) },
    body: JSON.stringify({
      from, to: [to], subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`El proveedor rechazó el envío (HTTP ${response.status}).`);
  return payload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    // verify_jwt=false es necesario para pg_net; la clave secreta se valida aquí.
    const supplied = req.headers.get("apikey") ?? "";
    const expected = getServiceKey();
    if (!supplied || supplied !== expected) return json({ error: "No autorizado" }, 401);

    const status = await senderStatus();
    const body = await req.json();
    if (body.accion === "verificar-configuracion") return json({ ok: true, ...status });
    if (!status.verified) return json({ error: "El proveedor y dominio remitente deben verificarse antes de enviar." }, 503);
    const supabase = adminClient();
    const { data: rows, error: takeError } = await supabase.rpc("rpc_tomar_notificaciones_pendientes", { p_limite: 3 });
    if (takeError) throw takeError;
    const results = [];
    for (const row of (rows ?? []) as Record<string, unknown>[]) {
      let ok = false;
      let errorText: string | null = null;
      let providerId: string | null = null;
      try {
        if (row.canal !== "correo") throw new Error("Canal no configurado: este proyecto solo envía correo; SMS está deshabilitado.");
        const { data: allowed, error: leaseError } = await supabase.rpc("rpc_iniciar_envio_notificacion", { p_id: row.id });
        if (leaseError) throw new Error("Envío incierto: verifica el proveedor antes de reintentar fuera de la ventana segura.");
        if (!allowed) continue;
        const sent = row.provider_id ? { id: row.provider_id } : await sendResend(row);
        ok = true;
        providerId = String(sent.id ?? "") || null;
      } catch (error) {
        errorText = error instanceof Error ? error.message : "Error desconocido";
        console.error(`Notificación ${row.id}:`, errorText);
      }
      const { error: resultError } = ok && providerId
        ? await supabase.rpc("rpc_confirmar_envio_notificacion", { p_id: row.id, p_provider_id: providerId })
        : await supabase.rpc("rpc_resultado_notificacion", { p_id: row.id, p_ok: false, p_error: errorText });
      if (resultError) {
        console.error("No se pudo registrar resultado:", row.id, resultError.message);
        results.push({ id: row.id, ok, result_saved: false, provider_id: providerId });
      } else {
        results.push({ id: row.id, ok, result_saved: true, provider_id: providerId });
      }
    }
    return json({ ok: true, procesadas: results.length, resultados: results });
  } catch (error) {
    console.error("enviar-notificaciones:", error instanceof Error ? error.name : "Error");
    return json({ error: "No se pudo procesar la cola de correo." }, 500);
  }
});
