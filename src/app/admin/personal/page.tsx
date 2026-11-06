import { requireStaff } from "@/lib/auth/staff";
import { Personnel } from "@/components/admin/personnel";
export default async function Page() { const p = await requireStaff(["supervisor", "administrador"]); return <Personnel currentId={p.id} admin={p.rol === "administrador"} />; }
