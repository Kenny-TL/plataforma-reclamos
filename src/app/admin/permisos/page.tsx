import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES, STAFF_ROLE_LABELS } from "@/lib/auth/roles";
export default async function Page() {
  await requireStaff(); const client = await createClient();
  const { data, error } = await client.from("transiciones_estado").select("accion,estado_origen,estado_destino,roles,etiqueta,requiere_motivo").order("orden").limit(200);
  return <><h1 className="mb-3 text-3xl font-bold">Roles y acciones autorizadas</h1><p className="mb-6 text-sm leading-6 text-slate-600">El personal utiliza los cuatro roles existentes. Las acciones se validan en el servidor y en la base de datos; la autorización también depende del estado y del área del expediente.</p>
    <div className="mb-5 grid gap-4 sm:grid-cols-2">{STAFF_ROLES.map((r) => <section className="panel" key={r}><h2 className="font-bold">{STAFF_ROLE_LABELS[r]}</h2><p className="mt-2 text-sm text-slate-600">{({ mesa_partes: "Recepción, revisión, clasificación, observación y derivación.", responsable_area: "Atención y borradores de respuesta de su área. Sin acceso a datos del reclamante.", supervisor: "Supervisión, aprobación, cierre, reportes y auditoría.", administrador: "Personal, catálogos, parámetros y reportes. Sin acceso operativo a expedientes individuales." })[r]}</p></section>)}</div>
    <section className="panel"><h2 className="font-bold">Transiciones configuradas</h2>{error ? <p role="alert" className="mt-4 text-red-800">No se pudieron consultar las acciones.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full"><thead><tr>{["Acción", "Origen → destino", "Roles", "Motivo"].map((h) => <th className="table-cell" key={h}>{h}</th>)}</tr></thead><tbody>{data?.map((t) => <tr key={t.accion + t.estado_origen}><td className="table-cell">{t.etiqueta}</td><td className="table-cell">{t.estado_origen} → {t.estado_destino}</td><td className="table-cell">{(t.roles as string[]).map((r) => STAFF_ROLE_LABELS[r as keyof typeof STAFF_ROLE_LABELS] ?? r).join(", ")}</td><td className="table-cell">{t.requiere_motivo ? "Obligatorio" : "Opcional"}</td></tr>)}</tbody></table></div>}</section>
  </>;
}
