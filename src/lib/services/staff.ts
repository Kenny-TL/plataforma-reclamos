import { supabase } from "@/lib/supabase/client";
import { functionError } from "@/lib/errors";
import type { Area, Category, State, StaffCatalogs, ClaimFilters, ClaimRow, Page, ClaimDetail, Profile, Indicators, ReportFilters, ExportRow, NotificationRow, AuditRow } from "@/lib/types/staff";

function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (["42501", "PGRST301", "PGRST302"].includes(error.code ?? "")) throw new Error("Tu sesión o perfil no autoriza esta operación. Actualiza la sesión.");
  if (["22023", "P0001", "P0002"].includes(error.code ?? "")) throw new Error(error.message);
  throw new Error("No se pudo completar la operación. Comprueba los datos y tu conexión.");
}
export async function staffRpc<T = { ok: boolean }>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, args); check(error); return data as T;
}
export async function staffCatalogs(): Promise<StaffCatalogs> {
  const [areas, categories, states] = await Promise.all([
    supabase.from("areas").select("id,codigo,nombre,activa,responsable_id").order("nombre").limit(500),
    supabase.from("categorias").select("id,nombre,descripcion,area_id,activa").order("nombre").limit(500),
    supabase.from("estados_reclamo").select("codigo,nombre,estado_publico,orden").order("orden").limit(100),
  ]); [areas, categories, states].forEach((r) => check(r.error));
  return { areas: (areas.data ?? []) as Area[], categorias: (categories.data ?? []) as Category[], estados: (states.data ?? []) as State[] };
}
export async function listClaims(filters: ClaimFilters, page: number): Promise<Page<ClaimRow>> {
  let query = supabase.from("v_bandeja_reclamos").select("id,codigo,fecha_registro,dni_enmascarado,reclamante,asunto,categoria_id,categoria,area_id,area,estado_codigo,estado,fecha_vencimiento,dias_restantes,estado_plazo", { count: "exact" });
  if (filters.query.trim()) query = query.ilike(filters.field, `%${filters.query.trim().replace(/[%_]/g, "")}%`);
  for (const [column, value] of [["estado_codigo", filters.estado], ["area_id", filters.area], ["categoria_id", filters.categoria], ["estado_plazo", filters.plazo]]) if (value) query = query.eq(column, value);
  if (filters.desde) query = query.gte("fecha_registro", filters.desde);
  if (filters.hasta) query = query.lte("fecha_registro", filters.hasta);
  if (filters.pendingOnly) query = query.neq("estado_plazo", "no_aplica");
  const { data, error, count } = await query.order(filters.sort, { ascending: filters.ascending }).order("id").range(page * 20, page * 20 + 19); check(error);
  return { rows: (data ?? []) as ClaimRow[], total: count ?? 0 };
}
export async function claimDetail(id: string): Promise<ClaimDetail> {
  const data = await staffRpc<ClaimDetail | null>("rpc_detalle_reclamo", { p_reclamo_id: id });
  if (!data?.resumen || !Array.isArray(data.acciones)) throw new Error("El reclamo no existe o está fuera de tu ámbito autorizado."); return data;
}
export async function staffDownload(id: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; url?: string; error?: string }>("anexos", { body: { accion: "descargar-personal", anexo_id: id } });
  if (error) throw new Error(await functionError(error)); if (!data?.ok || !data.url?.startsWith("https://")) throw new Error(data?.error ?? "Archivo no disponible."); return data.url;
}
export async function uploadResponseFile(claimId: string, file: File, existingId?: string) {
  const metadata = existingId ? { id: existingId } : await staffRpc<{ id: string }>("rpc_registrar_anexo_respuesta", { p_reclamo_id: claimId, p_nombre: file.name, p_nombre_archivo: file.name, p_mime_type: file.type, p_tamano_bytes: file.size });
  const body = new FormData(); body.set("accion", "subir-respuesta"); body.set("anexo_id", metadata.id); body.set("archivo", file, file.name);
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("anexos", { body });
  if (error) throw new Error(await functionError(error)); if (!data?.ok) throw new Error(data?.error ?? "No se pudo cargar el documento.");
}
export async function listProfiles(page: number): Promise<Page<Profile>> {
  const { data, error, count } = await supabase.from("perfiles").select("id,email,nombres,apellidos,rol,area_id,activo", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(page * 20, page * 20 + 19); check(error); return { rows: (data ?? []) as Profile[], total: count ?? 0 };
}
export async function areaManagers(areaId: number | null): Promise<Profile[]> {
  if (areaId === null) return [];
  const { data, error } = await supabase.from("perfiles").select("id,email,nombres,apellidos,rol,area_id,activo").eq("rol", "responsable_area").eq("activo", true).eq("area_id", areaId).order("nombres").limit(500);
  check(error); return (data ?? []) as Profile[];
}
export async function inviteStaff(email: string, nombres: string, apellidos: string) {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("crear-personal", { body: { email, nombres, apellidos } });
  if (error) throw new Error(await functionError(error)); if (!data?.ok) throw new Error(data?.error ?? "No se pudo enviar la invitación.");
}
export async function resetStaffAccess(email: string) {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("crear-personal", { body: { accion: "recuperar", email } });
  if (error) throw new Error(await functionError(error)); if (!data?.ok) throw new Error(data?.error ?? "No se pudo solicitar el restablecimiento.");
}
export function reportArgs(filters: ReportFilters) {
  if (filters.desde && filters.hasta && filters.desde > filters.hasta) throw new Error("La fecha inicial no puede superar la fecha final.");
  return { p_desde: filters.desde || null, p_hasta: filters.hasta || null, p_area_id: filters.area ? Number(filters.area) : null, p_categoria_id: filters.categoria ? Number(filters.categoria) : null };
}
export const indicators = (filters: ReportFilters) => staffRpc<Indicators>("rpc_indicadores_v2", reportArgs(filters));
export async function exportClaims(filters: ReportFilters): Promise<ExportRow[]> {
  if (!filters.desde || !filters.hasta) throw new Error("Selecciona un periodo para exportar.");
  const rows: ExportRow[] = [];
  for (let offset = 0; offset < 100000; offset += 500) {
    const batch = await staffRpc<ExportRow[]>("rpc_exportar_reclamos_v2", { ...reportArgs(filters), p_limite: 500, p_desplazamiento: offset }); rows.push(...batch);
    if (batch.length < 500) return rows;
  }
  throw new Error("El periodo supera el límite de exportación. Selecciona un intervalo menor.");
}
export async function listNotifications(page: number, status: string): Promise<Page<NotificationRow>> {
  let query = supabase.from("notificaciones").select("id,reclamo_id,tipo,canal,estado,intentos,ultimo_error,programada_at,enviada_at,created_at,provider_id", { count: "exact" }).is("destinatario_usuario_id", null);
  if (status) query = query.eq("estado", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range(page * 20, page * 20 + 19); check(error); return { rows: (data ?? []) as NotificationRow[], total: count ?? 0 };
}
export async function listAudit(page: number, table: string): Promise<Page<AuditRow>> {
  let query = supabase.from("v_auditoria_resumen").select("id,tabla,registro_id,operacion,accion,usuario_id,rol,created_at", { count: "exact" }); if (table) query = query.eq("tabla", table);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 30, page * 30 + 29); check(error); return { rows: (data ?? []) as AuditRow[], total: count ?? 0 };
}
export async function listConfig(resource: string, page: number) {
  const specs: Record<string, { columns: string; order: string }> = {
    areas: { columns: "id,codigo,nombre,activa,responsable_id", order: "nombre" }, categorias: { columns: "id,nombre,descripcion,area_id,activa", order: "nombre" },
    reglas_derivacion: { columns: "id,categoria_id,area_destino_id,prioridad,vigente_desde,vigente_hasta,activa", order: "id" },
    parametros: { columns: "clave,valor,descripcion", order: "clave" }, feriados: { columns: "fecha,descripcion", order: "fecha" }, plantillas: { columns: "clave,nombre,asunto,cuerpo,activa", order: "clave" },
  }; const spec = specs[resource]; if (!spec) throw new Error("Catálogo no permitido.");
  const { data, error, count } = await supabase.from(resource).select(spec.columns, { count: "exact" }).order(spec.order).range(page * 20, page * 20 + 19); check(error);
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], total: count ?? 0 };
}
export async function saveConfig(resource: string, key: string | number | null, values: Record<string, unknown>) {
  if (!["areas", "categorias", "reglas_derivacion", "parametros", "feriados", "plantillas"].includes(resource)) throw new Error("Catálogo no permitido.");
  const primary = ["parametros", "plantillas"].includes(resource) ? "clave" : resource === "feriados" ? "fecha" : "id";
  const query = key !== null ? supabase.from(resource).update(values).eq(primary, key) : supabase.from(resource).insert(values);
  const { error } = await query; check(error);
}
