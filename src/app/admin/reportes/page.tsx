import { requireStaff } from "@/lib/auth/staff";
import { Reports } from "@/components/admin/reports";
export default async function Page() { await requireStaff(["supervisor", "administrador"]); return <Reports />; }
