import { requireStaff } from "@/lib/auth/staff";
import { Notifications } from "@/components/admin/notifications";
export default async function Page() { await requireStaff(["mesa_partes", "supervisor"]); return <Notifications />; }
