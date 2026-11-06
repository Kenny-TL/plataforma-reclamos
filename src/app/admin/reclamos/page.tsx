import { requireStaff } from "@/lib/auth/staff";
import { ClaimList } from "@/components/admin/claim-list";
export default async function Page() { await requireStaff(["mesa_partes", "responsable_area", "supervisor"]); return <ClaimList />; }
