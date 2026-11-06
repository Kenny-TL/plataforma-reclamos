"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useTurnstile } from "@/hooks/use-turnstile";
import { loadCatalog, portalRequest } from "@/lib/services/portal";
import type { CatalogData, TrackingResult } from "@/lib/types/portal";
import { errorMessage } from "@/lib/errors";
import { validateFiles } from "@/lib/validation/files";
import { AttachmentRecovery } from "@/components/attachment-recovery";
import { formatDate } from "@/lib/dates";

export function ClaimCorrection({ dni, result, onCorrected }: { dni: string; result: TrackingResult; onCorrected: (result: TrackingResult) => void }) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null); const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [submitted, setSubmitted] = useState<TrackingResult | null>(null);
  const { containerRef, available, error: captchaError, requestToken, reset } = useTurnstile(!submitted);
  useEffect(() => { let active = true; loadCatalog().then((data) => { if (active) setCatalog(data); }).catch((e) => { if (active) setError(errorMessage(e)); }); return () => { active = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || submitted || !catalog) return; setError("");
    const invalid = validateFiles(files, catalog.limites); if (invalid) { setError(invalid); return; }
    const texto = String(new FormData(event.currentTarget).get("texto") ?? "").trim(); if (!texto) return;
    setBusy(true);
    try {
      const data = await portalRequest<TrackingResult>({ accion: "subsanar", dni, codigo: result.codigo, texto, anexos: files.map((f) => ({ nombre: f.name, nombre_archivo: f.name, mime_type: f.type, tamano_bytes: f.size })), turnstile_token: await requestToken() });
      if (!data.ok) throw new Error(data.mensaje ?? "No se pudo presentar la subsanación.");
      setSubmitted(data);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); reset(); }
  }
  if (submitted) return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><h3 className="font-bold">Subsanación recibida</h3><p className="mt-2 text-sm">La municipalidad recibió tu información. Estado: {submitted.estado}.</p>
    {files.length > 0 && <AttachmentRecovery dni={dni} codigo={result.codigo} attachments={submitted.anexos ?? []} files={files} completedIds={[]} />}
    <button type="button" onClick={() => onCorrected(submitted)} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-white">Actualizar seguimiento</button></section>;
  return <form onSubmit={submit} className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
    <h3 className="text-lg font-bold">Presentar subsanación</h3><p className="mt-2 whitespace-pre-wrap text-sm">{result.observacion?.texto}</p><p className="mt-2 text-sm">Plazo: {formatDate(result.observacion?.plazo)}</p>
    <label className="mt-4 block text-sm font-semibold" htmlFor="correction-text">Información corregida o adicional *</label>
    <textarea id="correction-text" name="texto" required maxLength={10000} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3" />
    <label className="mt-4 block text-sm font-semibold" htmlFor="correction-files">Documentos adicionales (opcional)</label>
    <input id="correction-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="mt-2 block w-full text-sm" />
    <p className="mt-2 text-xs">El límite de documentos se aplica de forma acumulada a las subsanaciones del mismo reclamo. El sistema validará los cupos disponibles.</p>
    <div ref={containerRef} className="mt-4" />{(error || captchaError) && <p role="alert" className="mt-3 text-sm text-red-800">{error || captchaError}</p>}
    {captchaError && <button type="button" onClick={reset} className="btn-secondary">Reintentar verificación</button>}
    <button disabled={busy || !catalog || !available} className="mt-4 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Presentando…" : "Presentar subsanación"}</button>
  </form>;
}
