"use client";
import { useState, type FormEvent } from "react";
import { staffRpc, uploadResponseFile } from "@/lib/services/staff";
import type { ClaimDetail } from "@/lib/types/staff";
import { loadCatalog } from "@/lib/services/portal";
import { validateFiles } from "@/lib/validation/files";
import { errorMessage } from "@/lib/errors";
import { Feedback } from "./common";
export function ResponseEditor({ detail, reload }: { detail: ClaimDetail; reload: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await staffRpc("rpc_guardar_borrador_respuesta", { p_reclamo_id: detail.resumen.id, p_asunto: form.get("asunto"), p_contenido: form.get("contenido"), p_conclusion: form.get("conclusion") }); setSuccess("Borrador guardado. Envía a aprobación desde Acciones cuando esté completo."); reload(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = event.currentTarget; const file = new FormData(form).get("archivo"); if (!(file instanceof File)) return; setBusy(true); setError("");
    try { const limits = (await loadCatalog()).limites; const invalid = validateFiles([file], limits); if (invalid) throw new Error(invalid); await uploadResponseFile(detail.resumen.id, file); form.reset(); setSuccess("Documento de respuesta cargado."); reload(); } catch (e) { setError(errorMessage(e)); reload(); } finally { setBusy(false); }
  }
  return <div className="space-y-5"><Feedback error={error} success={success} /><form onSubmit={save} className="panel space-y-4"><h2 className="text-lg font-bold">Borrador de respuesta</h2>
    {detail.respuesta?.comentario_devolucion && <p className="rounded-lg bg-amber-50 p-3 text-sm">Corrección solicitada: {detail.respuesta.comentario_devolucion}</p>}
    <label className="block text-sm font-semibold">Asunto<input name="asunto" className="field mt-2" defaultValue={detail.respuesta?.asunto ?? ""} maxLength={500} /></label>
    <label className="block text-sm font-semibold">Contenido<textarea name="contenido" className="field mt-2" rows={10} defaultValue={detail.respuesta?.contenido ?? ""} maxLength={50000} /></label>
    <label className="block text-sm font-semibold">Conclusión<textarea name="conclusion" className="field mt-2" rows={4} defaultValue={detail.respuesta?.conclusion ?? ""} maxLength={10000} /></label><button disabled={busy} className="btn">Guardar borrador</button>
  </form>{detail.respuesta && <form onSubmit={upload} className="panel"><h2 className="font-bold">Adjuntar documento de respuesta</h2><label className="mt-4 block text-sm">Archivo PDF, JPG o PNG<input className="field mt-2" type="file" name="archivo" accept=".pdf,.jpg,.jpeg,.png" required /></label><button className="btn mt-4" disabled={busy}>Cargar documento</button><p className="mt-2 text-xs text-slate-500">Si la carga falla, recupera el archivo pendiente desde Documentos.</p></form>}</div>;
}
