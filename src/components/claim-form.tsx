"use client";

import { FormEvent, InputHTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, ShieldCheck, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type CatalogItem = { id: number; nombre: string };
type CatalogLimits = {
  max_anexos: number;
  max_anexo_bytes: number;
  formatos: string[];
  descripcion_min: number;
  descripcion_max: number;
  plazo_dias_habiles: number;
};
type CatalogData = {
  areas: CatalogItem[];
  categorias: CatalogItem[];
  limites: CatalogLimits;
};
type PortalResponse = { ok?: boolean; data?: Record<string, unknown>; error?: string };
type RegisteredAttachment = { id: string; nombre_archivo: string; storage_path: string };
type Registration = {
  id: string;
  codigo: string;
  fecha_registro: string;
  estado: string;
  anexos: RegisteredAttachment[];
};
type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    theme?: "light";
  }) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const allowedMimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

async function getFunctionError(error: { message: string; context?: unknown }) {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown; details?: unknown };
      if (typeof body.error === "string" && body.error.trim()) {
        if (typeof body.details === "string") {
          try {
            const details = JSON.parse(body.details) as Record<string, unknown>;
            const fieldErrors = Object.values(details).filter((value): value is string => typeof value === "string");
            if (fieldErrors.length) return `${body.error} ${fieldErrors.join(" ")}`;
          } catch {
            return `${body.error} ${body.details}`;
          }
        }
        return body.error;
      }
    } catch {
      // Conserva el mensaje del SDK cuando el servidor no devuelve JSON.
    }
  }
  return error.message || "No se pudo completar la solicitud.";
}

export function ClaimForm() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const tokenRef = useRef("");
  const tokenWaiters = useRef<Array<(token: string) => void>>([]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    const { data, error } = await supabase.functions.invoke<PortalResponse>("portal-ciudadano", {
      body: { accion: "catalogos" },
    });
    if (error) {
      setCatalogError(await getFunctionError(error));
      setCatalog(null);
    } else if (!data?.ok || !data.data) {
      setCatalogError(data?.error ?? "Supabase devolvió una respuesta de catálogos no válida.");
      setCatalog(null);
    } else {
      const returned = data.data as unknown as CatalogData;
      if (!Array.isArray(returned.areas) || !Array.isArray(returned.categorias) || !returned.limites) {
        setCatalogError("La respuesta no contiene los catálogos y límites esperados.");
        setCatalog(null);
      } else {
        setCatalog(returned);
      }
    }
    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  const initializeTurnstile = useCallback(() => {
    if (!siteKey || !turnstileContainer.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: siteKey,
      action: "portal-ciudadano",
      callback: (token) => {
        setTurnstileError("");
        const waiter = tokenWaiters.current.shift();
        if (waiter) {
          waiter(token);
          window.turnstile?.reset(widgetId.current ?? undefined);
        } else {
          tokenRef.current = token;
          setTurnstileToken(token);
        }
      },
      "expired-callback": () => {
        tokenRef.current = "";
        setTurnstileToken("");
        setTurnstileError("La verificación venció. Espera una nueva verificación.");
      },
      "error-callback": () => {
        tokenRef.current = "";
        setTurnstileToken("");
        setTurnstileError("No se pudo completar Turnstile. Recarga la verificación e inténtalo de nuevo.");
        tokenWaiters.current.splice(0).forEach((waiter) => waiter(""));
      },
      theme: "light",
    });
    setTurnstileReady(true);
  }, []);

  useEffect(() => {
    const handleReady = () => initializeTurnstile();
    const handleError = () => setTurnstileError("No se pudo cargar el servicio de verificación de Cloudflare.");
    window.addEventListener("turnstile:ready", handleReady);
    window.addEventListener("turnstile:error", handleError);
    if (window.turnstile) window.setTimeout(handleReady, 0);
    return () => {
      window.removeEventListener("turnstile:ready", handleReady);
      window.removeEventListener("turnstile:error", handleError);
    };
  }, [initializeTurnstile]);

  const requestTurnstileToken = useCallback(async () => {
    if (tokenRef.current) {
      const token = tokenRef.current;
      tokenRef.current = "";
      setTurnstileToken("");
      window.turnstile?.reset(widgetId.current ?? undefined);
      return token;
    }
    return new Promise<string>((resolve, reject) => {
      tokenWaiters.current.push((token) => {
        if (token) resolve(token);
        else reject(new Error("Turnstile no generó un token válido. Inténtalo nuevamente."));
      });
    });
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList || !catalog) return;
    const incoming = Array.from(fileList);
    const all = [...selectedFiles, ...incoming];
    if (all.length > catalog.limites.max_anexos) {
      setSubmitError(`Puedes adjuntar hasta ${catalog.limites.max_anexos} archivos.`);
      return;
    }
    for (const file of incoming) {
      const extension = getFileExtension(file.name);
      if (!catalog.limites.formatos.includes(extension) || allowedMimeByExtension[extension] !== file.type) {
        setSubmitError(`${file.name}: formato no permitido. Adjunta PDF, JPG o PNG válidos.`);
        return;
      }
      if (file.size < 1 || file.size > catalog.limites.max_anexo_bytes) {
        setSubmitError(`${file.name}: el tamaño debe ser de 1 byte a ${formatBytes(catalog.limites.max_anexo_bytes)}.`);
        return;
      }
    }
    setSubmitError("");
    setSelectedFiles(all);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || registration || !catalog) return;
    setSubmitError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (description.trim().length < catalog.limites.descripcion_min || description.trim().length > catalog.limites.descripcion_max) {
      setSubmitError(`La descripción debe tener entre ${catalog.limites.descripcion_min} y ${catalog.limites.descripcion_max} caracteres.`);
      return;
    }

    const formData = new FormData(form);
    const attachments = selectedFiles.map((file) => ({
      nombre: file.name,
      nombre_archivo: file.name,
      mime_type: file.type,
      tamano_bytes: file.size,
    }));
    const payload = {
      ciudadano: {
        nombres: String(formData.get("nombres") ?? "").trim(),
        apellido_paterno: String(formData.get("apellido_paterno") ?? "").trim(),
        apellido_materno: String(formData.get("apellido_materno") ?? "").trim(),
        numero_documento: String(formData.get("numero_documento") ?? "").trim(),
        domicilio: String(formData.get("domicilio") ?? "").trim(),
        distrito: String(formData.get("distrito") ?? "").trim(),
        provincia: String(formData.get("provincia") ?? "").trim(),
        referencia: String(formData.get("referencia") ?? "").trim(),
        celular: String(formData.get("celular") ?? "").trim(),
        correo: String(formData.get("correo") ?? "").trim(),
      },
      reclamo: {
        asunto: String(formData.get("asunto") ?? "").trim(),
        categoria_id: Number(formData.get("categoria_id")),
        subcategoria: String(formData.get("subcategoria") ?? "").trim(),
        lugar: String(formData.get("lugar") ?? "").trim(),
        fecha_hechos: String(formData.get("fecha_hechos") ?? ""),
        descripcion: description.trim(),
        area_orientativa_id: formData.get("area_orientativa_id")
          ? Number(formData.get("area_orientativa_id"))
          : null,
        solucion: String(formData.get("solucion") ?? "").trim(),
      },
      anexos: attachments,
      acepta_declaracion: formData.get("acepta_declaracion") === "on",
    };

    setSubmitting(true);
    try {
      const token = await requestTurnstileToken();
      const { data, error } = await supabase.functions.invoke<PortalResponse>("portal-ciudadano", {
        body: { accion: "registrar", datos: payload, turnstile_token: token },
      });
      if (error) throw new Error(await getFunctionError(error));
      if (!data?.ok || !data.data || typeof data.data.codigo !== "string") {
        throw new Error(data?.error ?? "La función no confirmó el registro del reclamo.");
      }

      const created = data.data as unknown as Registration;
      if (selectedFiles.length > 0) {
        if (!Array.isArray(created.anexos) || created.anexos.length !== selectedFiles.length) {
          setUploadErrors(["El reclamo se registró, pero la respuesta no incluyó la metadata esperada de todos los anexos."]);
          setRegistration(created);
          return;
        }
        for (let index = 0; index < selectedFiles.length; index += 1) {
          const file = selectedFiles[index];
          const attachment = created.anexos[index];
          try {
            const uploadToken = await requestTurnstileToken();
            const body = new FormData();
            body.append("accion", "subir");
            body.append("dni", payload.ciudadano.numero_documento);
            body.append("codigo", created.codigo);
            body.append("anexo_id", attachment.id);
            body.append("turnstile_token", uploadToken);
            body.append("archivo", file, file.name);
            const { data: uploadData, error: uploadError } = await supabase.functions.invoke<PortalResponse>("anexos", { body });
            if (uploadError) throw new Error(await getFunctionError(uploadError));
            if (!uploadData?.ok) throw new Error(uploadData?.error ?? "La función no confirmó la carga del archivo.");
            setUploadedFiles((previous) => [...previous, file.name]);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido al subir el archivo.";
            setUploadErrors((previous) => [...previous, `${file.name}: ${message}`]);
          }
        }
      }
      setRegistration(created);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo registrar el reclamo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (registration) {
    const allFilesUploaded = selectedFiles.length === uploadedFiles.length && uploadErrors.length === 0;
    return (
      <section aria-live="polite" className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-950">Reclamo registrado</h2>
        <p className="mt-2 text-slate-600">Guarda este código para consultar el estado de tu solicitud.</p>
        <p className="mt-5 inline-flex rounded-xl bg-slate-100 px-4 py-3 font-mono text-xl font-bold tracking-wider text-slate-900">
          {registration.codigo}
        </p>
        <p className="mt-4 text-sm text-slate-600">Estado informado por el sistema: {registration.estado}</p>
        {selectedFiles.length > 0 && (
          <div className={`mt-6 rounded-xl p-4 text-sm ${allFilesUploaded ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {allFilesUploaded
              ? `Se cargaron ${uploadedFiles.length} archivo(s) correctamente.`
              : `El reclamo está registrado. Se cargaron ${uploadedFiles.length} de ${selectedFiles.length} archivos.`}
            {uploadErrors.map((message) => <p key={message} className="mt-2">{message}</p>)}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {catalogLoading && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Conectando con Supabase y cargando categorías, áreas y límites del formulario…</p>}
        {catalogError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"><span>No se pudieron cargar los catálogos: {catalogError}</span><button type="button" onClick={() => void loadCatalog()} className="self-start rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold hover:bg-red-100 sm:self-auto">Reintentar</button></div>}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><FileText className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-slate-950">Datos de la persona solicitante</h2><p className="mt-1 text-sm text-slate-500">Los campos con * son obligatorios.</p></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombres *" name="nombres" required autoComplete="given-name" />
            <Field label="Apellido paterno *" name="apellido_paterno" required autoComplete="family-name" />
            <Field label="Apellido materno *" name="apellido_materno" required />
            <Field label="DNI *" name="numero_documento" required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} minLength={8} title="Ingresa los 8 dígitos del DNI." />
            <Field label="Domicilio *" name="domicilio" required autoComplete="street-address" />
            <Field label="Distrito *" name="distrito" required defaultValue="Pillco Marca" />
            <Field label="Provincia *" name="provincia" required defaultValue="Huánuco" />
            <Field label="Referencia del domicilio" name="referencia" />
            <Field label="Celular" name="celular" inputMode="numeric" pattern="9[0-9]{8}" maxLength={9} title="Si lo indicas, debe tener 9 dígitos y empezar con 9." />
            <Field label="Correo electrónico" name="correo" type="email" autoComplete="email" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-slate-950">Detalle del reclamo</h2><p className="mt-1 text-sm text-slate-500">Describe los hechos con claridad para orientar su atención.</p></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Asunto *" name="asunto" required className="sm:col-span-2" />
            <SelectField label="Categoría *" name="categoria_id" required items={catalog?.categorias ?? []} loading={catalogLoading} />
            <SelectField label="Área orientativa" name="area_orientativa_id" items={catalog?.areas ?? []} loading={catalogLoading} optionalLabel="Sin preferencia" />
            <Field label="Subcategoría" name="subcategoria" />
            <Field label="Fecha de los hechos" name="fecha_hechos" type="date" max={new Date().toISOString().slice(0, 10)} />
            <Field label="Lugar de los hechos *" name="lugar" required className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label htmlFor="descripcion" className="mb-2 block text-sm font-semibold text-slate-800">Descripción *</label>
              <textarea id="descripcion" name="descripcion" required minLength={catalog?.limites.descripcion_min} maxLength={catalog?.limites.descripcion_max} value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className={controlClass} placeholder="Indica qué ocurrió, cuándo y cómo afecta a los vecinos." />
              <p className="mt-2 text-right text-xs text-slate-500">{description.trim().length}{catalog ? ` / ${catalog.limites.descripcion_max}` : ""} caracteres{catalog ? ` · mínimo ${catalog.limites.descripcion_min}` : ""}</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="solucion" className="mb-2 block text-sm font-semibold text-slate-800">¿Qué solución solicita? *</label>
              <textarea id="solucion" name="solucion" required rows={3} className={controlClass} placeholder="Describe la acción que esperas de la municipalidad." />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Upload className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-slate-950">Documentos de sustento <span className="font-normal text-slate-500">(opcional)</span></h2>
              <p className="mt-1 text-sm text-slate-500">{catalog ? `Hasta ${catalog.limites.max_anexos} archivos · ${catalog.limites.formatos.map((format) => format.toUpperCase()).join(", ")} · máximo ${formatBytes(catalog.limites.max_anexo_bytes)} por archivo.` : "Cargando límites…"}</p></div>
          </div>
          <label htmlFor="attachments" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-500 hover:bg-blue-50/50">
            <Upload className="mb-2 h-6 w-6 text-slate-500" />
            <span className="font-semibold text-slate-800">Selecciona documentos o imágenes</span>
            <span className="mt-1 text-xs text-slate-500">PDF, JPG o PNG</span>
            <input id="attachments" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} className="sr-only" disabled={!catalog || submitting} />
          </label>
          {selectedFiles.length > 0 && <ul className="mt-4 space-y-2">{selectedFiles.map((file, index) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="truncate pr-3">{file.name} <span className="text-slate-500">({formatBytes(file.size)})</span></span><button type="button" disabled={submitting} onClick={() => setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Quitar ${file.name}`} className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"><X className="h-4 w-4" /></button></li>)}</ul>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input type="checkbox" name="acepta_declaracion" required className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-800" />
            <span>Declaro que la información proporcionada es verdadera y autorizo su tratamiento para la atención de este reclamo. *</span>
          </label>
          <div className="mt-6">
            {siteKey ? <>
              <p className="mb-3 text-sm font-semibold text-slate-800">Verificación de seguridad *</p>
              <div ref={turnstileContainer} className="min-h-[66px]" />
              {!turnstileReady && !turnstileError && <p className="text-xs text-slate-500">Cargando verificación de Cloudflare…</p>}
              {turnstileError && <p role="alert" className="mt-2 text-sm text-red-700">{turnstileError}</p>}
            </> : <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Falta configurar `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; no se puede enviar el formulario con seguridad.</p>}
          </div>
          {submitError && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{submitError}</p>}
          <button type="submit" disabled={!catalog || catalogLoading || submitting || !siteKey || !turnstileReady || !turnstileToken} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto">
            {submitting ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Enviando…</> : "Enviar reclamo"}
          </button>
        </section>
      </form>
    </>
  );
}

const controlClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";

function Field({ label, name, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <div className={className}><label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-800">{label}</label><input id={name} name={name} className={controlClass} {...props} /></div>;
}

function SelectField({ label, name, items, loading, required, optionalLabel }: { label: string; name: string; items: CatalogItem[]; loading?: boolean; required?: boolean; optionalLabel?: string }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-800">{label}</label><select id={name} name={name} required={required} disabled={loading || items.length === 0} className={controlClass} defaultValue=""><option value="" disabled={required}>{loading ? "Cargando opciones…" : optionalLabel ?? "Selecciona una opción"}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div>;
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(0)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
