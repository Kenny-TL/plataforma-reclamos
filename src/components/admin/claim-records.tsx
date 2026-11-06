import type { ClaimDetail } from "@/lib/types/staff";
import { formatDate } from "@/lib/dates";
import { Badge, Empty } from "./common";
export function ReassignmentHistory({ detail }: { detail: ClaimDetail }) {
  return <section className="panel mt-5"><h2 className="font-bold">Solicitudes de reasignación</h2>{detail.reasignaciones.map((r) => <article key={r.id} className="mt-4 border-t pt-4"><Badge>{r.estado}</Badge><p className="mt-2 whitespace-pre-wrap text-sm">{r.motivo}</p><p className="mt-2 text-xs text-slate-500">{formatDate(r.created_at)}</p>{r.resolucion_motivo && <p className="mt-3 whitespace-pre-wrap text-sm">Resolución: {r.resolucion_motivo} · {formatDate(r.resuelto_at)}</p>}</article>)}{!detail.reasignaciones.length && <Empty />}</section>;
}
export function ClaimNotificationHistory({ detail }: { detail: ClaimDetail }) {
  if (!detail.notificaciones.length) return null;
  return <section className="panel mt-5"><h2 className="font-bold">Comunicaciones del expediente</h2>{detail.notificaciones.map((n) => <article key={n.id} className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-3"><div className="text-sm"><p>{n.tipo.replaceAll("_", " ")} · {n.canal}</p><p className="mt-1 text-xs text-slate-500">{formatDate(n.fecha)} · Intentos: {n.intentos}</p></div><Badge warning={n.estado === "fallida"}>{n.estado}</Badge></article>)}</section>;
}
