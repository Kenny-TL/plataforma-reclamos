"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
// Auth puede usar Site URL como fallback si redirectTo no está en la allowlist.
const needsPassword = typeof window !== "undefined" && /(?:#|&)type=(invite|recovery)(?:&|$)/.test(window.location.hash);
export function AuthLanding() {
  const router = useRouter();
  useEffect(() => {
    if (needsPassword) supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/auth/establecer-clave"); });
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") router.replace("/auth/establecer-clave"); });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}
