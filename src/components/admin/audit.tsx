"use client";
import { useCallback, useState } from "react";
import { useRemote } from "@/hooks/use-remote";
import { listAudit } from "@/lib/services/staff";
import { formatDate } from "@/lib/dates";
import { Empty, PageHeading, Pager, RemoteState } from "./common";
export function Audit() {
  const [page, setPage] = useState(0); const [table, setTable] = useState(""); const remote = useRemote(useCallback(() => listAudit(page, table), [page, table]));
  return <><PageHeading title="Auditoría" description="Registro inmutable de acciones autorizadas. Este resumen no muestra contenido de expedientes ni datos de ciudadanos." /><label className="panel mb-5 block text-sm font-semibold">Recurso<select className="field mt-2" value={table} onChange={(e) => { setTable(e.target.value); setPage(0); }}><option value="">Todos los autorizados</option>{["reclamos", "reclamo_respuestas", "reclamo_observaciones", "reclamo_reasignaciones", "perfiles", "areas", "categorias", "reglas_derivacion", "parametros", "plantillas", "feriados"].map((t) => <option key={t}>{t}</option>)}</select></label><RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} />
    {remote.data && <section className="panel"><div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Fecha", "Recurso", "Operación", "Acción", "Rol"].map((h) => <th className="table-cell" key={h}>{h}</th>)}</tr></thead><tbody>{remote.data.rows.map((r) => <tr key={r.id}><td className="table-cell whitespace-nowrap">{formatDate(r.created_at)}</td><td className="table-cell">{r.tabla}<p className="mt-1 max-w-40 break-all text-xs text-slate-500">{r.registro_id}</p></td><td className="table-cell">{r.operacion}</td><td className="table-cell">{r.accion}</td><td className="table-cell">{r.rol}</td></tr>)}</tbody></table></div>{!remote.data.rows.length && <Empty />}<Pager size={30} page={page} total={remote.data.total} onChange={setPage} /></section>}
  </>;
}
