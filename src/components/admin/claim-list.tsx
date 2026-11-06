"use client";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { useRemote } from "@/hooks/use-remote";
import { listClaims, staffCatalogs } from "@/lib/services/staff";
import { INITIAL_FILTERS, type ClaimFilters } from "@/lib/types/staff";
import { formatDate } from "@/lib/dates";
import { Badge, Empty, PageHeading, Pager, RemoteState } from "./common";

export function ClaimList() {
  const [draft, setDraft] = useState<ClaimFilters>(INITIAL_FILTERS); const [filters, setFilters] = useState<ClaimFilters>(INITIAL_FILTERS); const [page, setPage] = useState(0);
  const catalog = useRemote(staffCatalogs); const remote = useRemote(useCallback(() => listClaims(filters, page), [filters, page]));
  const change = (key: keyof ClaimFilters, value: string | boolean) => setDraft((previous) => ({ ...previous, [key]: value }));
  function search(event: FormEvent) { event.preventDefault(); setPage(0); setFilters({ ...draft }); }
  return <><PageHeading title="Bandeja de reclamos" description="Consulta y atiende los expedientes de tu ámbito autorizado. Los plazos se calculan en días hábiles." />
    <form onSubmit={search} className="panel mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-sm font-semibold">Buscar por<select className="field mt-2" value={draft.field} onChange={(e) => change("field", e.target.value)}><option value="codigo">Código</option><option value="asunto">Asunto</option></select></label>
      <label className="text-sm font-semibold">Texto de búsqueda<input className="field mt-2" maxLength={120} value={draft.query} onChange={(e) => change("query", e.target.value)} placeholder="Ingresa código o asunto" /></label>
      <label className="text-sm font-semibold">Estado<select className="field mt-2" value={draft.estado} onChange={(e) => change("estado", e.target.value)}><option value="">Todos los estados</option>{catalog.data?.estados.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}</select></label>
      <label className="text-sm font-semibold">Área<select className="field mt-2" value={draft.area} onChange={(e) => change("area", e.target.value)}><option value="">Todas las autorizadas</option>{catalog.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
      <label className="text-sm font-semibold">Categoría<select className="field mt-2" value={draft.categoria} onChange={(e) => change("categoria", e.target.value)}><option value="">Todas las categorías</option>{catalog.data?.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label className="text-sm font-semibold">Plazo<select className="field mt-2" value={draft.plazo} onChange={(e) => change("plazo", e.target.value)}><option value="">Todos</option><option value="vencido">Vencidos</option><option value="por_vencer">Próximos a vencer</option><option value="en_plazo">En plazo</option><option value="suspendido">Suspendidos</option><option value="no_aplica">Sin plazo activo</option></select></label>
      <label className="text-sm font-semibold">Registro desde<input type="date" className="field mt-2" value={draft.desde} onChange={(e) => change("desde", e.target.value)} max={draft.hasta || undefined} /></label>
      <label className="text-sm font-semibold">Registro hasta<input type="date" className="field mt-2" value={draft.hasta} onChange={(e) => change("hasta", e.target.value)} min={draft.desde || undefined} /></label>
      <label className="text-sm font-semibold">Orden<select className="field mt-2" value={`${draft.sort}:${draft.ascending}`} onChange={(e) => { const [sort, ascending] = e.target.value.split(":"); setDraft((p) => ({ ...p, sort: sort as ClaimFilters["sort"], ascending: ascending === "true" })); }}><option value="fecha_registro:false">Más recientes</option><option value="fecha_registro:true">Más antiguos</option><option value="fecha_vencimiento:true">Vencimiento próximo</option><option value="codigo:true">Código ascendente</option></select></label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.pendingOnly} onChange={(e) => change("pendingOnly", e.target.checked)} />Solo pendientes de respuesta</label>
      <div className="flex gap-2 sm:col-span-2"><button className="btn" disabled={remote.loading}>Aplicar filtros</button><button type="button" className="btn-secondary" onClick={() => { setDraft(INITIAL_FILTERS); setFilters(INITIAL_FILTERS); setPage(0); }}>Limpiar</button></div>
    </form><RemoteState loading={catalog.loading} error={catalog.error} retry={catalog.reload} /><RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} />
    {remote.data && <section className="panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><caption className="sr-only">Reclamos autorizados</caption><thead><tr>{["Código / registro", "Reclamo", "Área / categoría", "Estado", "Plazo"].map((h) => <th key={h} className="table-cell bg-slate-50 font-semibold">{h}</th>)}</tr></thead><tbody>{remote.data.rows.map((r) => <tr key={r.id}><td className="table-cell"><Link className="font-bold text-blue-800 underline-offset-4 hover:underline" href={`/admin/reclamos/${r.id}`}>{r.codigo}</Link><p className="mt-1 text-xs text-slate-500">{formatDate(r.fecha_registro)}</p></td><td className="table-cell"><p className="font-semibold">{r.asunto}</p><p className="mt-2 text-xs text-slate-500">{r.reclamante} · {r.dni_enmascarado}</p></td><td className="table-cell">{r.area}<p className="mt-1 text-xs text-slate-500">{r.categoria}</p></td><td className="table-cell"><Badge>{r.estado}</Badge></td><td className="table-cell"><Badge warning={r.estado_plazo === "vencido"}>{r.estado_plazo.replaceAll("_", " ")}</Badge><p className="mt-1 text-xs">{formatDate(r.fecha_vencimiento)}</p>{r.dias_restantes !== null && <p className="text-xs">{r.dias_restantes} días hábiles</p>}</td></tr>)}</tbody></table></div>{!remote.data.rows.length && <Empty />}<Pager page={page} total={remote.data.total} onChange={setPage} /></section>}
  </>;
}
