import { getClientIp, requiredEnv } from "./http.ts";

/** Valida el token siempre en el servidor. Los tokens Turnstile son de un solo uso. */
export async function verifyTurnstile(req: Request, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const allowed = requiredEnv("TURNSTILE_ALLOWED_HOSTNAMES")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) throw new Error("TURNSTILE_ALLOWED_HOSTNAMES está vacío");

  const payload: Record<string, string> = {
    secret: requiredEnv("TURNSTILE_SECRET_KEY"),
    response: token,
  };
  const ip = getClientIp(req);
  if (ip) payload.remoteip = ip;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return false;
  const result = await response.json();
  const hostname = String(result.hostname ?? "").toLowerCase();
  return result.success === true
    && result.action === "portal-ciudadano"
    && allowed.includes(hostname);
}
