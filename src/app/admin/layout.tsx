import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { StaffLogout } from "@/components/staff-logout";
import { STAFF_ROLE_LABELS } from "@/lib/auth/roles";
import { Landmark } from "lucide-react";

export const metadata = { title: "Gestión municipal", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const reporting = ["supervisor", "administrador"].includes(profile.rol);
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
      <Landmark className="h-9 w-9 text-blue-900" /><div className="min-w-0 flex-1"><Link href="/admin" className="font-bold text-blue-950">Pillco Marca · Gestión municipal</Link><p className="text-xs text-slate-500">{profile.nombres} {profile.apellidos} · {STAFF_ROLE_LABELS[profile.rol]}{profile.area_nombre ? ` · ${profile.area_nombre}` : ""}</p></div><StaffLogout />
    </div></header>
    <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[220px_1fr] lg:p-6">
      <aside><nav aria-label="Panel municipal" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-5 lg:flex-col">
        <Link className="nav-item" href="/admin">Inicio</Link>
        {profile.rol !== "administrador" && <Link className="nav-item" href="/admin/reclamos">Bandeja de reclamos</Link>}
        {reporting && <Link className="nav-item" href="/admin/reportes">Reportes e indicadores</Link>}
        {["mesa_partes", "supervisor"].includes(profile.rol) && <Link className="nav-item" href="/admin/notificaciones">Notificaciones</Link>}
        {reporting && <><Link className="nav-item" href="/admin/personal">Personal municipal</Link><Link className="nav-item" href="/admin/auditoria">Auditoría</Link></>}
        <Link className="nav-item" href="/admin/permisos">Roles y acciones</Link>
        {profile.rol === "administrador" && <Link className="nav-item" href="/admin/configuracion">Configuración</Link>}
        <Link className="nav-item" href="/">Portal ciudadano ↗</Link>
      </nav></aside><main id="main-content" className="min-w-0">{children}</main>
    </div>
  </div>;
}
