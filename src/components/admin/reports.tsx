"use client";
import { useCallback, useState, type FormEvent } from "react";
import { useRemote } from "@/hooks/use-remote";
import { indicators, exportClaims, staffCatalogs } from "@/lib/services/staff";
import { limaDate, formatDate } from "@/lib/dates";
import type { Distribution, ReportFilters } from "@/lib/types/staff";
import { csvDocument } from "@/lib/csv";
import { errorMessage } from "@/lib/errors";
import { Empty, Feedback, PageHeading, RemoteState } from "./common";

function Bars({ title, rows, field }: { title: string; rows: Distribution[]; field: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return <section className="panel"><h2 className="font-bold">{title}</h2>{!rows.some((r) => r.total > 0) ? <Empty>Sin reclamos para este periodo.</Empty> : <ul className="mt-5 space-y-4">{rows.map((row, index) => <li key={index}><div className="flex justify-between gap-3 text-xs"><span>{row[field]}</span><strong>{row.total}</strong></div><meter aria-label={String(row[field])} min={0} max={max} value={row.total} className="mt-1 h-4 w-full accent-blue-700" /></li>)}</ul>}</section>;
}
export function Reports({ dashboard = false }: { dashboard?: boolean }) {
  const today = limaDate(); const initial = { desde: today.slice(0, 4) + "-01-01", hasta: today, area: "", categoria: "" };
  const [draft, setDraft] = useState<ReportFilters>(initial); const [filters, setFilters] = useState<ReportFilters>(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const catalog = useRemote(staffCatalogs); const remote = useRemote(useCallback(() => indicators(filters), [filters]));
  function apply(event: FormEvent) { event.preventDefault(); setFilters({ ...draft }); }
  async function download() {
    if (busy) return; setBusy(true); setError("");
    try {
      const rows = await exportClaims(filters);
      const csv = csvDocument(["Código", "Registro", "Categoría", "Subcategoría", "Área", "Estado", "Vencimiento", "Días hábiles restantes", "Respuesta", "Cierre"], rows.map((r) => [r.codigo, formatDate(r.fecha_registro), r.categoria, r.subcategoria, r.area, r.estado, formatDate(r.fecha_vencimiento), r.dias_restantes, formatDate(r.fecha_respuesta), formatDate(r.fecha_cierre)]));
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "reclamos-" + filters.desde + "-" + filters.hasta + ".csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const change = (key: keyof ReportFilters, value: string) => setDraft((p) => ({ ...p, [key]: value })); const data = remote.data;
  return <><PageHeading title={dashboard ? "Resumen de atención" : "Reportes e indicadores"} description="Información real del periodo de registro seleccionado. Fechas y plazos calculados para America/Lima." />
    <form onSubmit={apply} className="panel no-print mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Desde<input type="date" required value={draft.desde} max={draft.hasta} onChange={(e) => change("desde", e.target.value)} className="field mt-2" /></label><label className="text-sm font-semibold">Hasta<input type="date" required value={draft.hasta} min={draft.desde} onChange={(e) => change("hasta", e.target.value)} className="field mt-2" /></label>
      <label className="text-sm font-semibold">Área<select value={draft.area} onChange={(e) => change("area", e.target.value)} className="field mt-2"><option value="">Todas</option>{catalog.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
      <label className="text-sm font-semibold">Categoría<select value={draft.categoria} onChange={(e) => change("categoria", e.target.value)} className="field mt-2"><option value="">Todas</option>{catalog.data?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4"><button className="btn" disabled={remote.loading}>Consultar periodo</button><button type="button" disabled={busy || remote.loading} onClick={download} className="btn-secondary">{busy ? "Preparando…" : "Exportar CSV para Excel"}</button><button type="button" disabled={!data} onClick={() => window.print()} className="btn-secondary">Imprimir / Guardar PDF</button></div>
    </form><Feedback error={error} /><RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} /><RemoteState loading={catalog.loading} error={catalog.error} retry={catalog.reload} />
    {data && <div className="space-y-5"><p className="text-sm text-slate-500">Periodo: {formatDate(filters.desde)} al {formatDate(filters.hasta)} · Área: {catalog.data?.areas.find((a) => String(a.id) === filters.area)?.nombre ?? "Todas"} · Categoría: {catalog.data?.categorias.find((c) => String(c.id) === filters.categoria)?.nombre ?? "Todas"}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Total recibidos", data.kpis.total], ["Nuevos", data.kpis.nuevos], ["En atención", data.kpis.en_atencion], ["Observados", data.kpis.observados], ["Próximos a vencer", data.kpis.proximos_a_vencer], ["Vencidos", data.kpis.vencidos], ["Respondidos", data.kpis.respondidos], ["Cerrados", data.kpis.cerrados]].map(([label, value]) => <article key={label} className="panel"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-blue-950">{value}</p></article>)}</div>
      <div className="grid gap-5 sm:grid-cols-2"><section className="panel"><h2 className="font-bold">Tiempo promedio de atención</h2><p className="mt-3 text-3xl font-bold text-blue-950">{data.kpis.tiempo_promedio_dias === null ? "Sin respuestas" : data.kpis.tiempo_promedio_dias + " días hábiles"}</p><p className="mt-3 text-xs leading-5 text-slate-500">Desde el registro hasta la respuesta; no descuenta periodos de suspensión.</p></section><section className="panel"><h2 className="font-bold">Respuestas dentro del plazo</h2><p className="mt-3 text-3xl font-bold text-blue-950">{data.kpis.pct_dentro_plazo === null ? "Sin respuestas" : data.kpis.pct_dentro_plazo + "%"}</p><p className="mt-3 text-xs leading-5 text-slate-500">Respuestas en o antes del vencimiento entre expedientes con respuesta.</p></section></div>
      <div className="grid gap-5 xl:grid-cols-2"><Bars title="Reclamos por estado" rows={data.por_estado} field="estado" /><Bars title="Reclamos por área" rows={data.por_area} field="area" /><Bars title="Reclamos por categoría" rows={data.por_categoria} field="categoria" /><Bars title="Evolución mensual" rows={data.evolucion} field="periodo" /></div>
      <section className="panel"><h2 className="font-bold">Tiempo de atención por área</h2><div className="mt-4 overflow-x-auto"><table className="w-full"><thead><tr><th className="table-cell">Área</th><th className="table-cell">Respondidos</th><th className="table-cell">Promedio hábil</th></tr></thead><tbody>{data.tiempos_por_area?.map((r) => <tr key={r.area}><td className="table-cell">{r.area}</td><td className="table-cell">{r.respondidos}</td><td className="table-cell">{r.promedio ?? "—"}</td></tr>)}</tbody></table></div>{!data.tiempos_por_area?.length && <Empty>Sin respuestas en el periodo.</Empty>}</section>
    </div>}
  </>;
}
