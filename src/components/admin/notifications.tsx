"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRemote } from "@/hooks/use-remote";
import { listNotifications, staffRpc } from "@/lib/services/staff";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Badge, Empty, Feedback, PageHeading, Pager, RemoteState } from "./common";
export function Notifications() {
  const [page, setPage] = useState(0); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const remote = useRemote(useCallback(() => listNotifications(page, status), [page, status]));
  async function retry(id: string) { if (busy || !window.confirm("¿Volver a poner este correo fallido en la cola de envío?")) return; setBusy(true); setError(""); try { await staffRpc("rpc_reintentar_notificacion", { p_id: id }); remote.reload(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <><PageHeading title="Notificaciones" description="Seguimiento del correo de reclamos. SMS permanece deshabilitado. Una notificación enviada no acredita su lectura." /><label className="panel mb-5 block text-sm font-semibold">Estado<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="field mt-2"><option value="">Todos</option>{["pendiente", "enviada", "fallida", "cancelada"].map((s) => <option key={s}>{s}</option>)}</select></label><Feedback error={error} /><RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} />
    {remote.data && <section className="panel"><div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Aviso", "Estado", "Intentos", "Fecha", "Operación"].map((h) => <th className="table-cell" key={h}>{h}</th>)}</tr></thead><tbody>{remote.data.rows.map((n) => <tr key={n.id}><td className="table-cell"><p className="font-semibold">{n.tipo.replaceAll("_", " ")}</p><p className="text-xs">{n.canal}</p>{n.reclamo_id && <Link className="mt-2 inline-block text-xs font-semibold text-blue-800" href={"/admin/reclamos/" + n.reclamo_id}>Ver expediente</Link>}</td><td className="table-cell"><Badge warning={n.estado === "fallida"}>{n.estado}</Badge>{n.ultimo_error && <p className="mt-2 max-w-xs text-xs text-red-800">{n.ultimo_error}</p>}{n.provider_id && <p className="mt-2 text-xs">Confirmación del proveedor registrada</p>}</td><td className="table-cell">{n.intentos}</td><td className="table-cell">{formatDate(n.enviada_at ?? n.programada_at)}</td><td className="table-cell">{n.estado === "fallida" && n.canal === "correo" && <button className="btn-secondary" disabled={busy} onClick={() => retry(n.id)}>Reintentar correo</button>}</td></tr>)}</tbody></table></div>{!remote.data.rows.length && <Empty />}<Pager page={page} total={remote.data.total} onChange={setPage} /></section>}
  </>;
}
