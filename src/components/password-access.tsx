"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

export function PasswordAccess({ recovery = false }: { recovery?: boolean }) {
  const [ready, setReady] = useState(recovery); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    if (recovery) return;
    let active = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => { if (active && session) setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (active) setReady(Boolean(data.session)); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [recovery]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget); setError(""); setMessage(""); setBusy(true);
    try {
      if (recovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email")).trim(), { redirectTo: `${location.origin}/auth/establecer-clave` });
        if (error) throw new Error("No se pudo solicitar la recuperación. Inténtalo más tarde.");
        setMessage("Si el correo tiene una cuenta habilitada, recibirás un enlace para recuperar el acceso.");
      } else {
        const password = String(form.get("password"));
        if (password.length < 12 || password !== form.get("confirm")) throw new Error("Usa al menos 12 caracteres y confirma la misma contraseña.");
        const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error("El enlace venció. Solicita una nueva invitación o recuperación.");
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw new Error("No se pudo establecer la contraseña. Comprueba los requisitos del enlace.");
        await supabase.auth.signOut({ scope: "local" }); setReady(false); setMessage("Contraseña guardada. Ya puedes iniciar sesión con tu cuenta municipal.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la solicitud."); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><section className="panel w-full max-w-md"><h1 className="text-2xl font-bold">{recovery ? "Recuperar acceso" : "Establecer contraseña"}</h1><p className="mt-2 text-sm text-slate-600">Personal municipal · Pillco Marca</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {recovery ? <label className="block text-sm font-semibold">Correo de tu cuenta<input className="field mt-2" name="email" type="email" autoComplete="email" required /></label> : ready ? <><label className="block text-sm font-semibold">Nueva contraseña<input className="field mt-2" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label className="block text-sm font-semibold">Confirmar contraseña<input className="field mt-2" name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label></> : !message && <p role="status" className="text-sm">Abre el enlace de invitación o recuperación enviado a tu correo. Si venció, solicita uno nuevo.</p>}
      {(ready || recovery) && <button className="btn w-full" disabled={busy}>{busy ? "Procesando…" : recovery ? "Enviar enlace" : "Guardar contraseña"}</button>}
    </form>{error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}<Link className="mt-5 inline-block text-sm font-semibold text-blue-800" href="/login">Volver al inicio de sesión</Link>
  </section></main>;
}
