import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { Reports } from "@/components/admin/reports";
import { STAFF_ROLE_LABELS } from "@/lib/auth/roles";
export default async function AdminPage() {
  const profile = await requireStaff();
  if (["supervisor", "administrador"].includes(profile.rol)) return <Reports dashboard />;
  return <><p className="text-sm font-semibold text-blue-800">{STAFF_ROLE_LABELS[profile.rol]}</p><h1 className="mt-2 text-3xl font-bold">Bienvenido, {profile.nombres}</h1><p className="mt-3 text-slate-600">{profile.area_nombre ?? "Atención municipal"} · Revisa los expedientes de tu ámbito y registra cada actuación.</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><Link href="/admin/reclamos" className="panel transition hover:border-blue-400"><h2 className="font-bold text-blue-900">Bandeja de reclamos →</h2><p className="mt-3 text-sm text-slate-600">Busca por código, estado, área, categoría, fecha o vencimiento.</p></Link><Link href="/admin/permisos" className="panel transition hover:border-blue-400"><h2 className="font-bold text-blue-900">Roles y acciones →</h2><p className="mt-3 text-sm text-slate-600">Consulta las operaciones permitidas por el flujo municipal.</p></Link></div></>;
}
