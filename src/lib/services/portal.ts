import { supabase } from "@/lib/supabase/client";
import { functionError } from "@/lib/errors";
import type { CatalogData, DownloadEnvelope, PortalEnvelope, Registration, TrackingResult } from "@/lib/types/portal";
export async function invokePublic<T>(name: string, body: Record<string, unknown> | FormData): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw new Error(await functionError(error)); if (!data) throw new Error("El servicio devolvió una respuesta vacía."); return data;
}
export async function portalRequest<T>(body: Record<string, unknown>): Promise<T> {
  const result = await invokePublic<PortalEnvelope<T>>("portal-ciudadano", body);
  if (!result.ok || !result.data) throw new Error(result.error ?? "El servicio no confirmó la operación."); return result.data;
}
export async function loadCatalog(): Promise<CatalogData> {
  const data = await portalRequest<CatalogData>({ accion: "catalogos" });
  if (!Array.isArray(data.areas) || !Array.isArray(data.categorias) || !data.limites || !Number.isInteger(data.limites.max_anexos) || data.limites.max_anexo_bytes < 1) throw new Error("Catálogo incompatible con el formulario."); return data;
}
export async function registerClaim(datos: Record<string, unknown>, token: string) {
  const data = await portalRequest<Registration>({ accion: "registrar", datos, turnstile_token: token });
  if (!data.id || !data.codigo || !Array.isArray(data.anexos)) throw new Error("El servicio no devolvió una constancia válida. Consulta tu reclamo antes de repetir el envío."); return data;
}
export async function trackClaim(dni: string, codigo: string, token: string) {
  const data = await portalRequest<TrackingResult>({ accion: "consultar", dni, codigo: codigo.trim().toUpperCase(), turnstile_token: token });
  if (!data.ok) throw new Error(data.mensaje ?? "No se encontró el reclamo.");
  if (!data.codigo || !Array.isArray(data.historial)) throw new Error("La respuesta de seguimiento no es válida."); return data;
}
export async function uploadCitizenFile(dni: string, codigo: string, anexoId: string, file: File, token: string) {
  const body = new FormData(); Object.entries({ accion: "subir", dni, codigo: codigo.trim().toUpperCase(), anexo_id: anexoId, turnstile_token: token }).forEach(([k, v]) => body.set(k, v)); body.set("archivo", file, file.name);
  const result = await invokePublic<{ ok?: boolean; error?: string }>("anexos", body); if (!result.ok) throw new Error(result.error ?? "No se confirmó la carga.");
}
export async function responseDownload(dni: string, codigo: string, anexoId: string, token: string) {
  const result = await invokePublic<DownloadEnvelope>("anexos", { accion: "descargar-respuesta", dni, codigo, anexo_id: anexoId, turnstile_token: token });
  if (!result.ok || !result.url || !result.url.startsWith("https://")) throw new Error(result.error ?? "Documento no disponible."); return { url: result.url, expiresAt: Date.now() + (result.expires_in ?? 300) * 1000 };
}
