"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Options = { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "light" };
declare global { interface Window { turnstile?: { render: (el: HTMLElement, options: Options) => string; reset: (id: string) => void; remove: (id: string) => void }; } }
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export function useTurnstile(enabled = true) {
  const containerRef = useRef<HTMLDivElement>(null); const widget = useRef<string | null>(null); const token = useRef("");
  const pending = useRef<{ resolve: (value: string) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [ready, setReady] = useState(false); const [available, setAvailable] = useState(false); const [error, setError] = useState("");
  const rejectPending = useCallback((message: string) => { if (pending.current) { clearTimeout(pending.current.timer); pending.current.reject(new Error(message)); pending.current = null; } }, []);
  useEffect(() => {
    let active = true;
    const initialize = () => {
      if (!enabled || !active || !siteKey || !window.turnstile || !containerRef.current || widget.current !== null) return;
      try { widget.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey, action: "portal-ciudadano", theme: "light",
        callback: (value) => { if (!active) return; setError(""); if (pending.current) { const waiting = pending.current; pending.current = null; clearTimeout(waiting.timer); waiting.resolve(value); } else { token.current = value; setAvailable(true); } },
        "expired-callback": () => { token.current = ""; setAvailable(false); },
        "error-callback": () => { token.current = ""; setAvailable(false); setError("No se pudo verificar la seguridad. Reintenta la verificación."); rejectPending("No se obtuvo un token de seguridad."); },
      }); setReady(true); } catch { setError("No se pudo iniciar la verificación. Reintenta."); }
    };
    const failed = () => { setError("No se pudo cargar Cloudflare Turnstile."); rejectPending("No se pudo cargar la verificación."); };
    window.addEventListener("turnstile:ready", initialize); window.addEventListener("turnstile:error", failed); const timer = window.setTimeout(initialize, 0);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("turnstile:ready", initialize); window.removeEventListener("turnstile:error", failed); rejectPending("La operación se canceló al salir de la página."); if (widget.current !== null) window.turnstile?.remove(widget.current); widget.current = null; token.current = ""; };
  }, [rejectPending, enabled]);
  const reset = useCallback(() => { token.current = ""; setAvailable(false); setError(""); if (widget.current !== null) window.turnstile?.reset(widget.current); else window.dispatchEvent(new Event("turnstile:ready")); }, []);
  const requestToken = useCallback(async () => {
    if (token.current) { const value = token.current; token.current = ""; setAvailable(false); return value; }
    if (!siteKey || widget.current === null) throw new Error("La verificación de seguridad no está lista."); if (pending.current) throw new Error("Ya hay una verificación en curso.");
    return new Promise<string>((resolve, reject) => { pending.current = { resolve, reject, timer: setTimeout(() => { pending.current = null; setError("La verificación tardó demasiado. Reintenta."); reject(new Error("Tiempo de verificación agotado.")); }, 60000) }; window.turnstile?.reset(widget.current!); });
  }, []);
  return { containerRef, ready, available, error, requestToken, reset, configured: Boolean(siteKey) };
}
