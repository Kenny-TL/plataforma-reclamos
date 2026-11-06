import { requireStaff } from "@/lib/auth/staff";
import { ClaimDetailView } from "@/components/admin/claim-detail";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const profile = await requireStaff(["mesa_partes", "responsable_area", "supervisor"]); const { id } = await params; if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound(); return <ClaimDetailView id={id} role={profile.rol} />; }
