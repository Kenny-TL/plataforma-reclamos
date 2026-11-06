import { adminClient } from "../_shared/supabase.ts";
import { HttpError, json } from "../_shared/http.ts";
import { requireStaff } from "../_shared/staff.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const BUCKET = "anexos-reclamos";
const formats: Record<string, string[]> = { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function signature(bytes: Uint8Array, mime: string) {
  if (mime === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  return false;
}
async function metadata(admin: ReturnType<typeof adminClient>, id: string) {
  if (!uuid.test(id)) throw new HttpError(400, "Identificador de documento inválido.");
  const { data, error } = await admin.from("reclamo_anexos").select("id,reclamo_id,origen,respuesta_id,subido_por,storage_path,mime_type,tamano_bytes,cargado,nombre_archivo").eq("id", id).maybeSingle();
  if (error || !data) throw new HttpError(404, "Documento no disponible.");
  return data;
}
export async function handleAnexos(req: Request): Promise<Response> {
  const admin = adminClient(req);
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData(); const action = String(form.get("accion") ?? "");
    if (!["subir", "subir-respuesta"].includes(action)) throw new HttpError(400, "Acción multipart no válida.");
    const staff = action === "subir-respuesta" ? await requireStaff(req) : null;
    const file = form.get("archivo"); const id = String(form.get("anexo_id") ?? "");
    if (!(file instanceof File) || !uuid.test(id)) throw new HttpError(400, "Datos del anexo incompletos.");
    if (!staff && !await verifyTurnstile(req, form.get("turnstile_token"))) throw new HttpError(403, "CAPTCHA inválido o vencido.");
    const meta = await metadata(admin, id);
    if (staff) {
      await requireStaff(req, meta.reclamo_id);
      if (staff.profile.rol !== "responsable_area" || meta.origen !== "respuesta" || meta.subido_por !== staff.profile.id) throw new HttpError(403, "Documento no autorizado para carga.");
      const { data: response } = await admin.from("reclamo_respuestas").select("id").eq("id", meta.respuesta_id).eq("reclamo_id", meta.reclamo_id).eq("estado", "borrador").maybeSingle();
      if (!response) throw new HttpError(409, "La respuesta no admite más documentos.");
    } else {
      const dni = String(form.get("dni") ?? ""); const codigo = String(form.get("codigo") ?? "").trim().toUpperCase();
      if (!/^\d{8}$/.test(dni) || !codigo) throw new HttpError(400, "DNI o código inválido.");
      if (!["registro", "subsanacion"].includes(meta.origen)) throw new HttpError(403, "Origen de documento no autorizado.");
      const { data, error } = await admin.rpc("rpc_consultar_reclamo", { p_dni: dni, p_codigo: codigo });
      if (error || !data?.ok) throw new HttpError(403, "No se pudo validar el reclamo.");
      const { data: claim } = await admin.from("reclamos").select("id").eq("codigo", codigo).eq("id", meta.reclamo_id).maybeSingle();
      if (!claim) throw new HttpError(403, "Documento no autorizado.");
    }
    const mime = file.type.toLowerCase(); const ext = meta.storage_path.split(".").pop()?.toLowerCase() ?? "";
    if (file.size < 1 || file.size > 5242880 || file.size !== Number(meta.tamano_bytes) || mime !== meta.mime_type || !formats[mime]?.includes(ext) || !meta.storage_path.startsWith(meta.reclamo_id + "/")) throw new HttpError(400, "El formato, tamaño o contenido no coincide con el documento registrado.");
    const bytes = new Uint8Array(await file.arrayBuffer()); if (!signature(bytes, mime)) throw new HttpError(400, "La firma del archivo no corresponde al formato permitido.");
    if (meta.cargado) return json({ ok: true, anexo_id: id, storage_path: meta.storage_path });
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(meta.storage_path, bytes, { contentType: mime, upsert: false });
    const existed = uploadError && String(uploadError.statusCode) === "409";
    if (uploadError && !existed) throw new HttpError(500, "No se pudo almacenar el archivo. Reintenta la carga.");
    let failed = false;
    if (staff) {
      const { error } = await staff.user.rpc("rpc_confirmar_anexo_respuesta", { p_anexo_id: id }); failed = Boolean(error);
    } else {
      const { error } = await admin.from("reclamo_anexos").update({ cargado: true }).eq("id", id).eq("reclamo_id", meta.reclamo_id).eq("cargado", false); failed = Boolean(error);
    }
    if (failed) {
      if (!existed) await admin.storage.from(BUCKET).remove([meta.storage_path]);
      throw new HttpError(409, "No se confirmó la carga. Actualiza el expediente y reintenta si sigue pendiente.");
    }
    return json({ ok: true, anexo_id: id, storage_path: meta.storage_path });
  }
  const body = await req.json();
  if (body.accion === "descargar-personal") {
    await requireStaff(req);
    const meta = await metadata(admin, String(body.anexo_id ?? "")); await requireStaff(req, meta.reclamo_id);
    if (!meta.cargado) throw new HttpError(404, "El documento aún no está cargado.");
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(meta.storage_path, 300, { download: meta.nombre_archivo });
    if (error || !data) throw new HttpError(500, "No se pudo preparar la descarga.");
    return json({ ok: true, url: data.signedUrl, expires_in: 300 });
  }
  if (body.accion !== "descargar-respuesta") throw new HttpError(400, "Acción no válida.");
  if (!await verifyTurnstile(req, body.turnstile_token)) throw new HttpError(403, "CAPTCHA inválido o vencido.");
  const dni = String(body.dni ?? ""); const codigo = String(body.codigo ?? "").trim().toUpperCase(); const id = String(body.anexo_id ?? "");
  if (!/^\d{8}$/.test(dni) || !codigo || !uuid.test(id)) throw new HttpError(400, "DNI, código y documento son obligatorios.");
  const { data: route, error } = await admin.rpc("rpc_ruta_anexo_respuesta", { p_dni: dni, p_codigo: codigo, p_anexo_id: id });
  if (error || !route?.ok) throw new HttpError(404, "Documento no disponible.");
  const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(route.storage_path, 300, { download: route.nombre_archivo });
  if (signError || !signed) throw new HttpError(500, "No se pudo preparar la descarga.");
  return json({ ok: true, url: signed.signedUrl, expires_in: 300, nombre_archivo: route.nombre_archivo });
}
