import { adminClient } from "./supabase.ts";
import { HttpError, getServiceKey, requiredEnv } from "./http.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

export async function requireStaff(request: Request, claimId?: string) {
  const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!jwt) throw new HttpError(401, "Sesión requerida.");
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, "Sesión no válida.");
  const { data: profile } = await admin.from("perfiles").select("id,rol,area_id,activo").eq("id", data.user.id).maybeSingle();
  if (!profile?.activo || !["mesa_partes", "responsable_area", "supervisor", "administrador"].includes(profile.rol)) throw new HttpError(403, "Perfil no autorizado.");
  if (profile.rol === "responsable_area") {
    const { data: area } = await admin.from("areas").select("id").eq("id", profile.area_id).eq("activa", true).maybeSingle();
    if (!area) throw new HttpError(403, "Área no autorizada.");
  }
  if (claimId) {
    if (profile.rol === "administrador") throw new HttpError(403, "El rol no permite acceder al expediente.");
    const { data: claim } = await admin.from("reclamos").select("id,area_id,estado_codigo").eq("id", claimId).maybeSingle();
    if (!claim || (profile.rol === "responsable_area" && profile.area_id !== claim.area_id)) throw new HttpError(403, "Expediente no autorizado.");
  }
  // Authorization usa el JWT del usuario; la clave de API permanece solo en Edge.
  const user = createClient(requiredEnv("SUPABASE_URL"), getServiceKey(), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + jwt } } });
  return { admin, profile, user };
}
