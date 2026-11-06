export const corsHeaders = {
  "Access-Control-Allow-Origin": (Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "").split(",")[0].trim(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Limita bytes realmente recibidos, incluso sin Content-Length. */
export function serve(handler: (request: Request) => Promise<Response>, maxBytes = 256 * 1024) {
  Deno.serve(async (request) => {
    const allowed = (Deno.env.get("CORS_ALLOWED_ORIGIN") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const origin = request.headers.get("origin");
    const headers = { ...corsHeaders, "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0] ?? "", "Cache-Control": "no-store", "Vary": "Origin" };
    const finish = (response: Response) => { const output = new Response(response.body, response); Object.entries(headers).forEach(([k, v]) => output.headers.set(k, v)); return output; };
    if (origin && !allowed.includes(origin)) return finish(json({ error: "Origen no autorizado." }, 403));
    if (request.method === "OPTIONS") return finish(new Response(null, { status: 204 }));
    if (request.method !== "POST") return finish(json({ error: "Método no permitido." }, 405));
    try {
      if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new HttpError(413, "Solicitud demasiado grande.");
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Solicitud demasiado grande."); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return finish(await handler(new Request(request, { body: bytes.buffer })));
    } catch (error) {
      if (error instanceof HttpError) return finish(json({ error: error.message }, error.status));
      if (error instanceof SyntaxError) return finish(json({ error: "El cuerpo de la solicitud no es válido." }, 400));
      console.error("Fallo de operación Edge", error instanceof Error ? error.name : "UnknownError");
      return finish(json({ error: "No se pudo completar la operación." }, 500));
    }
  });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function getClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return null;
}

export function getServiceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keysJson) {
    try {
      const keys = JSON.parse(keysJson);
      if (keys.default) return keys.default;
    } catch { /* handled below */ }
  }
  throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEYS.default");
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta configurar el secreto ${name}`);
  return value;
}
