import { requireStaff } from "@/lib/auth/staff";
import { Configuration } from "@/components/admin/configuration";
export default async function Page() { await requireStaff(["administrador"]); return <Configuration />; }
