import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

type StaffProfileRow = {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: string;
  area_id: number | null;
  activo: boolean;
};

export type StaffProfile = Omit<StaffProfileRow, "rol"> & {
  rol: StaffRole;
  area_nombre: string | null;
};

export type StaffAccess =
  | { authorized: true; profile: StaffProfile }
  | { authorized: false; reason: "session" | "profile" | "inactive" | "role" | "area" | "verification" };

export const getCurrentStaff = cache(async (): Promise<StaffAccess> => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { authorized: false, reason: "session" };

  const { data, error: profileError } = await supabase
    .from("perfiles")
    .select("id,email,nombres,apellidos,rol,area_id,activo")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) return { authorized: false, reason: "verification" };
  if (!data) return { authorized: false, reason: "profile" };

  const profile = data as StaffProfileRow;
  if (!profile.activo) return { authorized: false, reason: "inactive" };
  if (!STAFF_ROLES.includes(profile.rol as StaffRole)) return { authorized: false, reason: "role" };
  if (profile.rol === "responsable_area" && profile.area_id === null) {
    return { authorized: false, reason: "area" };
  }

  let areaName: string | null = null;
  if (profile.area_id !== null) {
    const { data: area, error: areaError } = await supabase
      .from("areas")
      .select("nombre,activa")
      .eq("id", profile.area_id)
      .maybeSingle();

    if (areaError && profile.rol === "responsable_area") {
      return { authorized: false, reason: "area" };
    }
    areaName = area?.nombre ?? null;
    if (profile.rol === "responsable_area" && (!areaName || !area?.activa)) {
      return { authorized: false, reason: "area" };
    }
  }

  return {
    authorized: true,
    profile: { ...profile, rol: profile.rol as StaffRole, area_nombre: areaName },
  };
});

export async function requireStaff(roles?: readonly StaffRole[]): Promise<StaffProfile> {
  const access = await getCurrentStaff();
  if (!access.authorized) redirect(`/login?reason=${access.reason}`);
  if (roles && !roles.includes(access.profile.rol)) notFound();
  return access.profile;
}
