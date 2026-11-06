"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function StaffLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setErrorMessage("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setErrorMessage("No se pudo cerrar la sesión. Inténtalo nuevamente.");
      setPending(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={handleLogout} disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Cerrar sesión
      </button>
      {errorMessage && <p role="alert" className="text-xs text-red-700">{errorMessage}</p>}
    </div>
  );
}
