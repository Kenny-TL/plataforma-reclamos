import { requireStaff } from "@/lib/auth/staff";
import { Audit } from "@/components/admin/audit";
export default async function Page() { await requireStaff(["supervisor", "administrador"]); return <Audit />; }
