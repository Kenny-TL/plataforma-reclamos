"use client";
import { useState } from "react";
import type { RegisteredAttachment } from "@/lib/types/portal";
import { useTurnstile } from "@/hooks/use-turnstile";
import { uploadCitizenFile } from "@/lib/services/portal";
import { errorMessage } from "@/lib/errors";

export function AttachmentRecovery({ dni, codigo, attachments, files, completedIds }: { dni: string; codigo: string; attachments: RegisteredAttachment[]; files: File[]; completedIds: string[] }) {
  const [done, setDone] = useState(completedIds); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const { containerRef, available, error: captchaError, requestToken, reset } = useTurnstile();
  const remaining = attachments.map((attachment, index) => ({ attachment, file: files[index] })).filter(({ attachment, file }) => file && !done.includes(attachment.id));
  async function retry() {
    if (busy) return; setBusy(true); setError("");
    try { for (const { attachment, file } of remaining) { await uploadCitizenFile(dni, codigo, attachment.id, file, await requestToken()); setDone((previous) => [...previous, attachment.id]); } }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); reset(); }
  }
  return <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <h3 className="font-semibold">Recuperar archivos pendientes</h3>
    <p className="mt-2 text-sm">Tu reclamo ya está registrado. {remaining.length ? `Faltan ${remaining.length} archivo(s); puedes reintentar sin registrar otro reclamo.` : "Todos los archivos se cargaron."}</p>
    <div ref={containerRef} className="mt-3" />
    {(error || captchaError) && <p role="alert" className="mt-2 text-sm text-red-800">{error || captchaError}</p>}
    {captchaError && <button type="button" onClick={reset} className="btn-secondary mt-2">Reintentar verificación</button>}
    <button type="button" onClick={retry} disabled={busy || !remaining.length || !available} className="mt-3 rounded-lg bg-blue-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Cargando…" : "Reintentar archivos"}</button>
  </div>;
}
