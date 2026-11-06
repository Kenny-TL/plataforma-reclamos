import { createClient } from "npm:@supabase/supabase-js@2";
import { getClientIp, getServiceKey, requiredEnv } from "./http.ts";

export function adminClient(req?: Request) {
  const headers: Record<string, string> = {};
  // Reenvía la IP al contexto PostgREST para que las funciones SQL existentes
  // puedan aplicar sus controles basados en request.headers.
  if (req) {
    const ip = getClientIp(req);
    if (ip) headers["x-forwarded-for"] = ip;
  }
  return createClient(requiredEnv("SUPABASE_URL"), getServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers },
  });
}
