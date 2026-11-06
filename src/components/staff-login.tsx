"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Landmark, LoaderCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

const accessMessages: Record<string, string> = {
  callback: "El enlace no es válido o ya venció. Solicita un enlace nuevo.",
  inactive: "La cuenta existe, pero aún no está activa. Solicita al administrador que habilite tu perfil.",
  profile: "La cuenta no tiene un perfil municipal asociado. Contacta al administrador.",
  role: "Tu cuenta no tiene un rol autorizado para el acceso municipal.",
  area: "El perfil de responsable de área no tiene un área válida asignada. Contacta al administrador.",
  verification: "No se pudo verificar tu perfil en este momento. Inténtalo nuevamente.",
  session: "Inicia sesión con tu cuenta municipal para continuar.",
};

export function StaffLogin({ reason }: { reason?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(reason ? accessMessages[reason] ?? "Tu sesión no tiene autorización para acceder al panel." : "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setErrorMessage("");
    setSubmitting(true);
    try {

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      setPassword("");
      setErrorMessage("Correo electrónico o contraseña incorrectos.");
      setSubmitting(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("perfiles")
      .select("rol,activo,area_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut({ scope: "local" });
      setPassword("");
      setErrorMessage("No se pudo verificar tu autorización. Inténtalo de nuevo más tarde.");
      setSubmitting(false);
      return;
    }

    if (!profileData) {
      await supabase.auth.signOut({ scope: "local" });
      setErrorMessage(accessMessages.profile);
      setPassword("");
      setSubmitting(false);
      return;
    }

    const role = profileData.rol as string;
    let deniedReason: string | null = null;
    if (!profileData.activo) deniedReason = "inactive";
    else if (!STAFF_ROLES.includes(role as StaffRole)) deniedReason = "role";
    else if (role === "responsable_area" && profileData.area_id === null) deniedReason = "area";

    if (deniedReason) {
      await supabase.auth.signOut({ scope: "local" });
      setPassword("");
      setErrorMessage(accessMessages[deniedReason]);
      setSubmitting(false);
      return;
    }

    setPassword("");
    router.replace("/admin");
    router.refresh();
    } catch { setErrorMessage("No se pudo verificar el acceso. Reintenta la solicitud."); }
    finally { setSubmitting(false); setPassword(""); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-white shadow-sm"><Landmark className="h-7 w-7" /></div>
          <p className="mt-4 text-sm font-semibold text-blue-800">Municipalidad Distrital de Pillco Marca</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Acceso del personal</h1>
          <p className="mt-2 text-sm text-slate-600">Ingresa con las credenciales de tu cuenta municipal autorizada.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            <div>
              <label htmlFor="staff-email" className="mb-2 block text-sm font-semibold text-slate-800">Correo electrónico</label>
              <input id="staff-email" name="email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" placeholder="nombre@municipalidad.gob.pe" />
            </div>

            <div>
              <label htmlFor="staff-password" className="mb-2 block text-sm font-semibold text-slate-800">Contraseña</label>
              <div className="relative">
                <input id="staff-password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" placeholder="Ingresa tu contraseña" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-blue-800">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-800">{errorMessage}</p>}

          <button type="submit" disabled={submitting} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Verificando acceso…</> : <><KeyRound className="h-4 w-4" /> Iniciar sesión</>}
          </button>

          <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />El acceso requiere un perfil municipal activo y un rol autorizado. No hay registro público.</p>
        </form>
        <p className="mt-6 text-center text-sm"><Link href="/recuperar-acceso" className="font-semibold text-blue-800">Recuperar contraseña</Link></p>
        <p className="mt-4 text-center text-xs text-slate-500">Si necesitas acceso, comunícate con el administrador del sistema.</p>
      </div>
    </main>
  );
}
