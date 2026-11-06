"use client";
import { useCallback, useState, type FormEvent } from "react";
import { useRemote } from "@/hooks/use-remote";
import { listProfiles, staffCatalogs, staffRpc, inviteStaff, resetStaffAccess } from "@/lib/services/staff";
import { STAFF_ROLE_LABELS, STAFF_ROLES } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types/staff";
import { errorMessage } from "@/lib/errors";
import { Badge, Empty, Feedback, PageHeading, Pager, RemoteState } from "./common";

export function Personnel({ currentId, admin }: { currentId: string; admin: boolean }) {
  const [page, setPage] = useState(0); const [editing, setEditing] = useState<Profile | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const remote = useRemote(useCallback(() => listProfiles(page), [page])); const catalog = useRemote(staffCatalogs);
  async function submit(event: FormEvent<HTMLFormElement>, invite: boolean) {
    event.preventDefault(); if (busy) return; const element = event.currentTarget; const form = new FormData(element);
    if (!window.confirm(invite ? "¿Enviar la invitación a esta persona?" : "¿Guardar los cambios de acceso del personal?")) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      if (invite) await inviteStaff(String(form.get("email")).trim(), String(form.get("nombres")).trim(), String(form.get("apellidos")).trim());
      else if (editing) await staffRpc("rpc_actualizar_personal", { p_id: editing.id, p_nombres: String(form.get("nombres")).trim(), p_apellidos: String(form.get("apellidos")).trim(), p_rol: form.get("rol"), p_area_id: form.get("area_id") ? Number(form.get("area_id")) : null, p_activo: form.get("activo") === "on" });
      setSuccess(invite ? "Invitación enviada. Asigna rol/área y activa el perfil cuando corresponda." : "Perfil actualizado."); setEditing(null); element.reset(); remote.reload();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function recover(email: string) {
    if (busy || !window.confirm("¿Enviar un enlace de recuperación de acceso a " + email + "?")) return;
    setBusy(true); setError(""); setSuccess("");
    try { await resetStaffAccess(email); setSuccess("Solicitud de recuperación enviada. El estado y rol del perfil no cambian."); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <><PageHeading title="Personal municipal" description="Cuentas autorizadas, roles y áreas. Se conserva el historial del personal; no se eliminan cuentas desde este panel." /><Feedback error={error} success={success} />
    {admin && <details className="panel mb-5"><summary className="cursor-pointer font-bold">Invitar personal autorizado</summary><form onSubmit={(e) => void submit(e, true)} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">Nombres<input name="nombres" className="field mt-2" maxLength={150} required /></label><label className="text-sm">Apellidos<input name="apellidos" className="field mt-2" maxLength={150} required /></label><label className="text-sm sm:col-span-2">Correo de la cuenta<input name="email" type="email" className="field mt-2" maxLength={254} required /></label><p className="text-xs text-slate-500 sm:col-span-2">La persona establecerá su contraseña mediante un enlace seguro. El perfil nace inactivo y sin área.</p><button className="btn sm:col-span-2" disabled={busy}>Enviar invitación</button></form></details>}
    <RemoteState loading={remote.loading} error={remote.error} retry={remote.reload} /><RemoteState loading={catalog.loading} error={catalog.error} retry={catalog.reload} />
    {remote.data && <section className="panel"><div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Personal", "Rol", "Área", "Estado", "Acceso"].map((h) => <th className="table-cell" key={h}>{h}</th>)}</tr></thead><tbody>{remote.data.rows.map((p) => <tr key={p.id}><td className="table-cell"><p className="font-semibold">{p.nombres} {p.apellidos}</p><p className="mt-1 text-xs text-slate-500">{p.email}</p></td><td className="table-cell">{STAFF_ROLE_LABELS[p.rol]}</td><td className="table-cell">{catalog.data?.areas.find((a) => a.id === p.area_id)?.nombre ?? "Sin área"}</td><td className="table-cell"><Badge warning={!p.activo}>{p.activo ? "Activo" : "Inactivo"}</Badge></td><td className="table-cell">{admin && <button className="btn-secondary" onClick={() => setEditing(p)} disabled={busy}>Editar{p.id === currentId ? " mis datos" : ""}</button>}</td></tr>)}</tbody></table></div>{!remote.data.rows.length && <Empty />}<Pager page={page} total={remote.data.total} onChange={setPage} /></section>}
    {editing && admin && <form key={editing.id} onSubmit={(e) => void submit(e, false)} className="panel mt-5 space-y-4"><h2 className="font-bold">Editar: {editing.email}</h2><label className="block text-sm">Nombres<input className="field mt-2" name="nombres" required maxLength={150} defaultValue={editing.nombres} /></label><label className="block text-sm">Apellidos<input className="field mt-2" name="apellidos" required maxLength={150} defaultValue={editing.apellidos} /></label>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => recover(editing.email)}>Enviar enlace de recuperación</button>
      <fieldset disabled={editing.id === currentId} className="space-y-4"><label className="block text-sm">Rol<select className="field mt-2" name="rol" defaultValue={editing.rol}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>)}</select></label><label className="block text-sm">Área<select className="field mt-2" name="area_id" defaultValue={editing.area_id ?? ""}><option value="">Sin área</option>{catalog.data?.areas.filter((a) => a.activa).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label><label className="flex gap-2 text-sm"><input type="checkbox" name="activo" defaultChecked={editing.activo} />Cuenta activa</label></fieldset>
      {editing.id === currentId && <><input type="hidden" name="rol" value={editing.rol} /><input type="hidden" name="area_id" value={editing.area_id ?? ""} />{editing.activo && <input type="hidden" name="activo" value="on" />}<p className="text-xs text-slate-500">Tus permisos y estado están protegidos. Puedes actualizar tus nombres y apellidos.</p></>}
      <div className="flex gap-2"><button className="btn" disabled={busy}>Guardar cambios</button><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button></div>
    </form>}
  </>;
}
