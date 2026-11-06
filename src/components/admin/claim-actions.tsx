"use client";
import { useState, type FormEvent } from "react";
import { staffRpc } from "@/lib/services/staff";
import type { ClaimDetail, StaffCatalogs } from "@/lib/types/staff";
import type { StaffRole } from "@/lib/auth/roles";
import { errorMessage } from "@/lib/errors";
import { Feedback } from "./common";

export function ClaimActions({ detail, catalog, role, reload }: { detail: ClaimDetail; catalog: StaffCatalogs; role: StaffRole; reload: () => void }) {
  const [action, setAction] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const selected = detail.acciones.find((a) => a.accion === action); const id = detail.resumen.id;
  async function run(event: FormEvent<HTMLFormElement>, mode: "action" | "note" | "manual") {
    event.preventDefault(); if (busy) return; const form = event.currentTarget; const values = new FormData(form);
    if (!window.confirm("¿Confirmas registrar esta operación en el expediente? Quedará en el historial.")) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      if (mode === "note") await staffRpc("rpc_registrar_actuacion", { p_reclamo_id: id, p_texto: values.get("texto") });
      else if (mode === "manual") await staffRpc("rpc_registrar_notificacion_manual", { p_reclamo_id: id, p_canal: values.get("canal"), p_detalle: values.get("detalle"), p_tipo: "respuesta" });
      else {
        const data: Record<string, unknown> = {};
        if (action === "confirmar_categoria") data.categoria_id = Number(values.get("categoria_id"));
        if (action === "derivar") data.area_id = Number(values.get("area_id"));
        if (action === "registrar_observacion") data.texto = values.get("texto");
        if (action === "solicitar_reasignacion" && values.get("area_sugerida_id")) data.area_sugerida_id = Number(values.get("area_sugerida_id"));
        await staffRpc("rpc_ejecutar_accion", { p_reclamo_id: id, p_accion: action, p_motivo: values.get("motivo") || null, p_datos: data });
      }
      setSuccess("Operación registrada."); form.reset(); setAction(""); reload();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function resolve(id: string, approve: boolean) {
    const reason = window.prompt(approve ? "Motivo de aprobación de reasignación:" : "Motivo de rechazo de reasignación:"); if (!reason?.trim() || busy) return;
    setBusy(true); setError(""); try { await staffRpc("rpc_resolver_reasignacion", { p_reasignacion_id: id, p_aprobar: approve, p_motivo: reason.trim() }); reload(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="space-y-5"><Feedback error={error} success={success} />
    <form onSubmit={(e) => void run(e, "action")} className="panel space-y-4"><h2 className="text-lg font-bold">Acciones disponibles</h2><label className="block text-sm font-semibold">Operación<select className="field mt-2" required value={action} onChange={(e) => setAction(e.target.value)}><option value="">Selecciona una acción</option>{detail.acciones.map((a) => <option key={a.accion} value={a.accion}>{a.etiqueta}</option>)}</select></label>
      {selected && <><p className="text-sm text-slate-600">{selected.ayuda}</p>
        {action === "derivar" && <label className="block text-sm font-semibold">Área de destino<select className="field mt-2" name="area_id" required><option value="">Selecciona un área activa</option>{catalog.areas.filter((a) => a.activa && a.id !== detail.resumen.area_id).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>}
        {action === "confirmar_categoria" && <label className="block text-sm font-semibold">Categoría<select className="field mt-2" name="categoria_id" required defaultValue={detail.resumen.categoria_id}>{catalog.categorias.filter((c) => c.activa).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>}
        {action === "solicitar_reasignacion" && <label className="block text-sm font-semibold">Área sugerida<select className="field mt-2" name="area_sugerida_id"><option value="">Sin sugerencia</option>{catalog.areas.filter((a) => a.activa).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>}
        {action === "registrar_observacion" && <label className="block text-sm font-semibold">Información que debe subsanar el ciudadano<textarea className="field mt-2" name="texto" rows={4} maxLength={10000} required /></label>}
        <label className="block text-sm font-semibold">Motivo{(selected.requiere_motivo || action === "derivar") && " *"}<textarea className="field mt-2" name="motivo" rows={3} maxLength={10000} required={selected.requiere_motivo || action === "derivar"} /></label>
        <button disabled={busy} className="btn">{busy ? "Registrando…" : selected.etiqueta}</button>
      </>}{!detail.acciones.length && <p className="text-sm text-slate-500">No hay transiciones autorizadas para tu rol en este estado.</p>}
    </form>
    {["responsable_area", "supervisor"].includes(role) && <form onSubmit={(e) => void run(e, "note")} className="panel"><h2 className="font-bold">Registrar avance interno</h2><label className="mt-3 block text-sm">Descripción<textarea className="field mt-2" name="texto" rows={4} maxLength={10000} required /></label><p className="mt-2 text-xs text-slate-500">Esta nota no se muestra al ciudadano.</p><button className="btn mt-4" disabled={busy}>Guardar avance</button></form>}
    {["mesa_partes", "supervisor"].includes(role) && <>
      {detail.reasignaciones.filter((r) => r.estado === "pendiente").map((r) => <section key={r.id} className="panel"><h2 className="font-bold">Reasignación pendiente</h2><p className="mt-2 whitespace-pre-wrap text-sm">{r.motivo}</p><div className="mt-4 flex gap-3"><button disabled={busy} onClick={() => resolve(r.id, true)} className="btn">Aprobar</button><button disabled={busy} onClick={() => resolve(r.id, false)} className="btn-secondary">Rechazar</button></div></section>)}
      {detail.resumen.estado_codigo === "respondido" && <form onSubmit={(e) => void run(e, "manual")} className="panel"><h2 className="font-bold">Registrar comunicación por canal alterno</h2><p className="mt-2 text-sm text-slate-600">Registra únicamente una comunicación realizada. Permite acreditar la notificación de la respuesta.</p><label className="mt-4 block text-sm">Canal<select name="canal" className="field mt-2"><option value="telefono">Teléfono</option><option value="presencial">Presencial</option><option value="otro">Otro</option></select></label><label className="mt-4 block text-sm">Constancia o detalle<textarea name="detalle" className="field mt-2" required rows={3} maxLength={10000} /></label><button className="btn mt-4" disabled={busy}>Registrar notificación realizada</button></form>}
    </>}
  </div>;
}
