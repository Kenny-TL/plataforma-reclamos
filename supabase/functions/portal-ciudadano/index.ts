import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders, json, serve } from "../_shared/http.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const MAX_BODY = 256 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) return json({ error: "Solicitud demasiado grande" }, 413);

  try {
    const body = await req.json();
    const accion = body?.accion;
    const supabase = adminClient(req);

    // Los catálogos son información pública; las operaciones con datos personales
    // y toda escritura requieren una verificación Turnstile reciente.
    if (accion === "catalogos") {
      const { data, error } = await supabase.rpc("rpc_catalogos_portal");
      if (error) throw error;
      return json({ ok: true, data });
    }

    if (!["registrar", "consultar", "subsanar"].includes(accion)) {
      return json({ error: "Acción no válida" }, 400);
    }
    if (!await verifyTurnstile(req, body.turnstile_token)) {
      return json({ error: "Verificación CAPTCHA inválida o vencida. Vuelve a intentarlo." }, 403);
    }

    let result;
    if (accion === "registrar") {
      if (!body.datos || typeof body.datos !== "object") {
        return json({ error: "Faltan los datos del reclamo" }, 400);
      }
      result = await supabase.rpc("rpc_registrar_reclamo", { p_datos: body.datos });
    } else if (accion === "consultar") {
      const dni = String(body.dni ?? "");
      const codigo = String(body.codigo ?? "");
      if (!/^\d{8}$/.test(dni) || !codigo) return json({ error: "DNI o código no válido" }, 400);
      result = await supabase.rpc("rpc_consultar_reclamo", { p_dni: dni, p_codigo: codigo });
    } else {
      const dni = String(body.dni ?? "");
      const codigo = String(body.codigo ?? "");
      const texto = String(body.texto ?? "");
      const anexos = Array.isArray(body.anexos) ? body.anexos : [];
      if (!/^\d{8}$/.test(dni) || !codigo || !texto.trim()) {
        return json({ error: "DNI, código y texto de subsanación son obligatorios" }, 400);
      }
      result = await supabase.rpc("rpc_presentar_subsanacion", {
        p_dni: dni, p_codigo: codigo, p_texto: texto, p_anexos: anexos,
      });
    }

    if (result.error) {
      console.error("RPC portal-ciudadano:", result.error.code);
      return json({ error: ["22023", "P0001"].includes(result.error.code) ? result.error.message : "No se pudo procesar la solicitud.", details: result.error.code === "22023" ? result.error.details ?? null : null }, 400);
    }
    return json({ ok: true, data: result.data });
  } catch (error) {
    console.error("portal-ciudadano:", error instanceof Error ? error.name : "Error");
    return json({ error: "No se pudo completar la solicitud." }, 500);
  }
});
