"use client";
import { useCallback, useState, type FormEvent } from "react";
import { useRemote } from "@/hooks/use-remote";
import { listConfig, saveConfig, staffCatalogs, areaManagers } from "@/lib/services/staff";
import { errorMessage } from "@/lib/errors";
import { Empty, Feedback, PageHeading, Pager, RemoteState } from "./common";

type FieldSpec = { key: string; label: string; type: "text" | "textarea" | "number" | "date" | "checkbox" | "select"; required?: boolean; options?: Array<{ value: string | number; label: string }>; locked?: boolean };
const resources = [{ key: "areas", label: "Áreas" }, { key: "categorias", label: "Categorías" }, { key: "reglas_derivacion", label: "Reglas de derivación" }, { key: "feriados", label: "Feriados" }, { key: "parametros", label: "Parámetros" }, { key: "plantillas", label: "Plantillas" }];
export function Configuration() {
  const [resource, setResource] = useState("areas"); const [page, setPage] = useState(0); const [editing, setEditing] = useState<Record<string, unknown> | null>(null); const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const remote = useRemote(useCallback(() => listConfig(resource, page), [resource, page])); const catalog = useRemote(staffCatalogs);
  const selectedArea = resource === "areas" && typeof editing?.id === "number" ? editing.id : null;
  const people = useRemote(useCallback(() => areaManagers(selectedArea), [selectedArea]));
  const areas = catalog.data?.areas.filter((a) => a.activa).map((a) => ({ value: a.id, label: a.nombre })) ?? [];
  const categories = catalog.data?.categorias.filter((c) => c.activa).map((c) => ({ value: c.id, label: c.nombre })) ?? [];
  const primary = ["parametros", "plantillas"].includes(resource) ? "clave" : resource === "feriados" ? "fecha" : "id";
  const specs: Record<string, FieldSpec[]> = {
    areas: [{ key: "codigo", label: "Código institucional", type: "text", required: true, locked: !creating }, { key: "nombre", label: "Nombre del área", type: "text", required: true }, { key: "responsable_id", label: "Responsable del área", type: "select", options: people.data?.map((p) => ({ value: p.id, label: p.nombres + " " + p.apellidos })) }, { key: "activa", label: "Área activa", type: "checkbox" }],
    categorias: [{ key: "nombre", label: "Nombre", type: "text", required: true }, { key: "descripcion", label: "Descripción", type: "textarea" }, { key: "area_id", label: "Área asociada", type: "select", options: areas }, { key: "activa", label: "Categoría activa", type: "checkbox" }],
    reglas_derivacion: [{ key: "categoria_id", label: "Categoría", type: "select", options: categories, required: true }, { key: "area_destino_id", label: "Área de destino", type: "select", options: areas, required: true }, { key: "prioridad", label: "Prioridad (menor número primero)", type: "number", required: true }, { key: "vigente_desde", label: "Vigente desde", type: "date", required: true }, { key: "vigente_hasta", label: "Vigente hasta", type: "date" }, { key: "activa", label: "Regla activa", type: "checkbox" }],
    feriados: [{ key: "fecha", label: "Fecha", type: "date", required: true, locked: !creating }, { key: "descripcion", label: "Descripción", type: "text", required: true }],
    parametros: [{ key: "clave", label: "Parámetro", type: "text", locked: true }, { key: "valor", label: "Valor", type: typeof editing?.valor === "boolean" ? "checkbox" : typeof editing?.valor === "number" ? "number" : "text", required: true, locked: Array.isArray(editing?.valor) || editing?.clave === "sms_habilitado" }, { key: "descripcion", label: "Descripción", type: "textarea" }],
    plantillas: [{ key: "clave", label: "Identificador de plantilla", type: "text", required: true, locked: !creating }, { key: "nombre", label: "Nombre", type: "text", required: true }, { key: "asunto", label: "Asunto", type: "text" }, { key: "cuerpo", label: "Contenido", type: "textarea", required: true }, { key: "activa", label: "Plantilla activa", type: "checkbox" }],
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !editing) return; if (!window.confirm("¿Guardar esta configuración institucional? Afectará las operaciones posteriores y quedará auditada.")) return;
    const form = new FormData(event.currentTarget); const values: Record<string, unknown> = {};
    for (const field of specs[resource]) {
      if (field.locked) continue;
      const value = form.get(field.key);
      if (field.type === "checkbox") values[field.key] = value === "on";
      else if (field.type === "number" || (field.type === "select" && field.key !== "responsable_id")) values[field.key] = value ? Number(value) : null;
      else values[field.key] = value ? String(value).trim() : null;
    }
    setBusy(true); setError(""); setSuccess("");
    try { await saveConfig(resource, creating ? null : editing[primary] as string | number, values); setSuccess("Configuración guardada."); setEditing(null); setCreating(false); remote.reload(); catalog.reload(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function switchResource(next: string) { setResource(next); setPage(0); setEditing(null); setCreating(false); setError(""); setSuccess(""); }
  return <><PageHeading title="Configuración institucional" description="Administra los catálogos existentes. Desactiva registros que ya no deban utilizarse para conservar las referencias históricas." />
    <nav aria-label="Catálogos" className="mb-5 flex flex-wrap gap-2">{resources.map((r) => <button key={r.key} className={r.key === resource ? "btn" : "btn-secondary"} onClick={() => switchResource(r.key)}>{r.label}</button>)}</nav>
    <Feedback error={error} success={success} /><RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} /><RemoteState loading={catalog.loading} error={catalog.error} retry={catalog.reload} />
    {remote.data && <section className="panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{resources.find((r) => r.key === resource)?.label}</h2>{resource !== "parametros" && <button className="btn" onClick={() => { setCreating(true); setEditing({ activa: true, prioridad: 100 }); }}>Crear registro</button>}</div>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-cell">Registro</th><th className="table-cell">Estado / valor</th><th className="table-cell">Operación</th></tr></thead><tbody>{remote.data.rows.map((row, index) => { const identity = row[primary] ?? row.id ?? row.codigo ?? row.nombre ?? row.descripcion ?? row.fecha ?? index; return <tr key={`${resource}:${String(identity)}:${index}`}><td className="table-cell"><p className="font-semibold">{String(row.nombre ?? row.descripcion ?? row.clave ?? row.fecha ?? ("Regla " + row.id))}</p><p className="mt-1 text-xs text-slate-500">{String(row.codigo ?? row.clave ?? row.fecha ?? "")}</p></td><td className="table-cell">{resource === "parametros" ? JSON.stringify(row.valor) : "activa" in row ? row.activa ? "Activo" : "Inactivo" : "Vigente"}</td><td className="table-cell"><button className="btn-secondary" onClick={() => { setCreating(false); setEditing(row); }}>Editar</button></td></tr>; })}</tbody></table></div>{!remote.data.rows.length && <Empty />}<Pager page={page} total={remote.data.total} onChange={setPage} />
    </section>}
    {editing && <form key={resource + ":" + String(editing[primary] ?? "new")} onSubmit={save} className="panel mt-5 space-y-4"><h2 className="font-bold">{creating ? "Crear registro" : "Editar registro"}</h2>
      {specs[resource].map((f) => <label key={f.key} className="block text-sm font-semibold">{f.label}
        {f.type === "checkbox" ? <input name={f.key} type="checkbox" className="ml-3" defaultChecked={Boolean(editing[f.key])} disabled={f.locked} /> : f.type === "select" ? <select className="field mt-2" name={f.key} defaultValue={String(editing[f.key] ?? "")} required={f.required}><option value="">Selecciona una opción</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : f.type === "textarea" ? <textarea className="field mt-2" rows={5} maxLength={20000} name={f.key} defaultValue={String(editing[f.key] ?? "")} required={f.required} /> : <input className="field mt-2" name={f.key} type={f.type} min={f.type === "number" ? 1 : undefined} step={f.type === "number" ? 1 : undefined} maxLength={500} defaultValue={Array.isArray(editing[f.key]) ? (editing[f.key] as string[]).join(", ") : String(editing[f.key] ?? "")} readOnly={f.locked} required={f.required} />}
      </label>)}
      {resource === "areas" && <><p className="text-xs text-slate-500">El responsable debe tener un perfil activo asignado a esta área. Primero guarda el área y asigna el perfil desde Personal.</p><RemoteState loading={people.loading} error={people.error} retry={people.reload} /></>}
      {resource === "plantillas" && <p className="text-xs text-slate-500">Conserva las variables existentes entre dobles llaves para insertar código, entidad, observación y plazo.</p>}
      <div className="flex gap-2"><button className="btn" disabled={busy}>Guardar configuración</button><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button></div>
    </form>}
  </>;
}
