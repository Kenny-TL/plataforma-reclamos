"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Download, FileText, LoaderCircle, MapPin, Search, ShieldCheck } from "lucide-react";
import type { TrackingResult } from "@/lib/types/portal";
import { trackClaim, responseDownload } from "@/lib/services/portal";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/dates";
import { useTurnstile } from "@/hooks/use-turnstile";
import { ClaimCorrection } from "@/components/claim-correction";

type SignedDownload = { url: string; expiresAt: number };
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const controlClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

export function ClaimTracking() {
  const [codigo, setCodigo] = useState("");
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [queryError, setQueryError] = useState("");
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [signedDownloads, setSignedDownloads] = useState<Record<string, SignedDownload>>({});
  const { containerRef, ready: turnstileReady, available: tokenAvailable, error: turnstileError, requestToken, reset } = useTurnstile();

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const normalizedCode = codigo.trim().toUpperCase();
    const normalizedDni = dni.trim();
    if (!normalizedCode || !/^\d{8}$/.test(normalizedDni)) {
      setQueryError("Ingresa el código del reclamo y el DNI de 8 dígitos usado al registrarlo.");
      return;
    }
    setLoading(true);
    setQueryError("");
    setResult(null);
    setIdentityDni("");
    setDownloadError("");
    setSignedDownloads({});
    try {
      const turnstileToken = await requestToken();
      const data = await trackClaim(normalizedDni, normalizedCode, turnstileToken);
      setResult(data); setIdentityDni(normalizedDni); setDni("");
    } catch (error) {
      setQueryError(errorMessage(error));
    } finally {
      setLoading(false); reset();
    }
  }

  async function prepareDownload(anexoId: string) {
    if (!result || !codigo.trim() || downloadBusy) return;
    setDownloadBusy(anexoId);
    setDownloadError("");
    setSignedDownloads((previous) => {
      const next = { ...previous };
      delete next[anexoId];
      return next;
    });
    try {
      const turnstileToken = await requestToken();
      const link = await responseDownload(identityDni, result.codigo, anexoId, turnstileToken);
      setSignedDownloads((previous) => ({ ...previous, [anexoId]: link }));
    } catch {
      setDownloadError("No se pudo completar la verificación para descargar el documento.");
    } finally {
      setDownloadBusy(null); reset();
    }
  }

  const [identityDni, setIdentityDni] = useState("");

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Search className="h-5 w-5" /></div>
          <div><h3 className="text-lg font-bold text-slate-950">Identifica tu solicitud</h3><p className="mt-1 text-sm text-slate-500">Usa el código que recibiste al registrar el reclamo y el mismo DNI.</p></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="tracking-code" className="mb-2 block text-sm font-semibold text-slate-800">Código del reclamo *</label><input id="tracking-code" name="codigo" required value={codigo} onChange={(event) => setCodigo(event.target.value)} autoComplete="off" className={controlClass} placeholder="REC-AAAA-NNNNNN" /></div>
          <div><label htmlFor="tracking-dni" className="mb-2 block text-sm font-semibold text-slate-800">DNI *</label><input id="tracking-dni" name="dni" required value={dni} onChange={(event) => setDni(event.target.value)} inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} autoComplete="off" className={controlClass} placeholder="8 dígitos" /></div>
        </div>
        <div className="mt-6">
          {siteKey ? <>
            <p className="mb-3 text-sm font-semibold text-slate-800">Verificación de seguridad *</p>
            <div ref={containerRef} className="min-h-[66px]" />
            {!turnstileReady && !turnstileError && <p className="text-xs text-slate-500">Cargando verificación…</p>}
            {turnstileError && <><p role="alert" className="mt-2 text-sm text-red-700">{turnstileError}</p><button type="button" onClick={reset} className="btn-secondary mt-2">Reintentar verificación</button></>}
          </> : <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">La verificación de seguridad no está configurada.</p>}
        </div>
        {queryError && <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{queryError}</p>}
        <button type="submit" disabled={!siteKey || !turnstileReady || !tokenAvailable || loading} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400">
          {loading ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Consultando…</> : <><Search className="h-4 w-4" /> Consultar reclamo</>}
        </button>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />El DNI y el código se usan para validar la consulta y no se guardan de forma persistente en el navegador.</p>
      </form>

      {result?.observacion && <ClaimCorrection dni={identityDni} result={result} onCorrected={setResult} />}
      {result && <TrackingDetails
        result={result}
        onPrepareDownload={prepareDownload}
        downloadBusy={downloadBusy}
        downloadError={downloadError}
        signedDownloads={signedDownloads}
      />}
    </div>
  );
}

function TrackingDetails({
  result,
  onPrepareDownload,
  downloadBusy,
  downloadError,
  signedDownloads,
}: {
  result: TrackingResult;
  onPrepareDownload: (anexoId: string) => void;
  downloadBusy: string | null;
  downloadError: string;
  signedDownloads: Record<string, SignedDownload>;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section aria-live="polite" className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-800">Seguimiento del reclamo</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">{result.codigo}</h3>
            <p className="mt-2 text-slate-700">{result.asunto}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900"><span className="h-2 w-2 rounded-full bg-blue-700" />{result.estado}</span>
        </div>
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Fecha de registro" value={formatDate(result.fecha_registro)} />
          <InfoItem icon={<MapPin className="h-4 w-4" />} label="Área responsable" value={result.area} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h4 className="text-lg font-bold text-slate-950">Historial de atención</h4>
        {result.historial.length > 0 ? <ol className="mt-6 space-y-0">
          {result.historial.map((item, index) => <li key={`${item.fecha}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {index < result.historial.length - 1 && <span aria-hidden="true" className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />}
            <span className="relative z-10 mt-1 h-5 w-5 shrink-0 rounded-full border-4 border-blue-100 bg-blue-700" />
            <div className="min-w-0"><p className="font-semibold text-slate-900">{item.evento}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{formatDate(item.fecha)}</p></div>
          </li>)}
        </ol> : <p className="mt-3 text-sm text-slate-600">El sistema no devolvió movimientos públicos para mostrar.</p>}
      </div>

      {result.observacion && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-8">
        <h4 className="font-bold text-amber-950">Información pendiente de atención</h4>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-amber-950">{result.observacion.texto}</p>
        <p className="mt-4 text-sm font-semibold text-amber-900">Plazo informado: {formatDate(result.observacion.plazo)}</p>
      </div>}

      {result.respuesta && <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-5 w-5" /><h4 className="text-lg font-bold">Respuesta municipal</h4></div>
        {result.respuesta.asunto && <h5 className="mt-5 font-semibold text-slate-950">{result.respuesta.asunto}</h5>}
        {result.respuesta.contenido && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.respuesta.contenido}</p>}
        {result.respuesta.conclusion && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">{result.respuesta.conclusion}</p>}
        {result.respuesta.fecha && <p className="mt-4 text-sm text-slate-500">Fecha de respuesta: {formatDate(result.respuesta.fecha)}</p>}
        {result.respuesta.anexos.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5">
          <h5 className="font-semibold text-slate-900">Documentos adjuntos a la respuesta</h5>
          <ul className="mt-3 space-y-3">{result.respuesta.anexos.map((anexo) => {
            const link = signedDownloads[anexo.id];
            const isExpired = !link || link.expiresAt <= now;
            return <li key={anexo.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-800"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="break-all">{anexo.nombre}</span></span>
              {isExpired ? <button type="button" disabled={downloadBusy !== null} onClick={() => onPrepareDownload(anexo.id)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50">{downloadBusy === anexo.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Preparar descarga</button>
                : <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900"><Download className="h-4 w-4" />Descargar · 5 min</a>}
            </li>;
          })}</ul>
          {downloadError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{downloadError}</p>}
        </div>}
      </div>}
    </section>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2.5"><span className="mt-0.5 text-slate-500">{icon}</span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p></div></div>;
}
