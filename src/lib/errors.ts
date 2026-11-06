export async function functionError(error: { message?: string; context?: unknown }): Promise<string> {
  if (error.context instanceof Response) {
    if (error.context.status >= 500) return "El servicio no está disponible. Inténtalo nuevamente más tarde.";
    try {
      const body = await error.context.clone().json() as { error?: string; details?: string }; let details = "";
      try { details = Object.values(JSON.parse(body.details ?? "{}")).filter((x) => typeof x === "string").join(" "); } catch { /* Detalles internos sin formato no se muestran. */ }
      if (body.error) return `${body.error} ${details}`.trim();
    } catch { /* Respuesta no JSON. */ }
  }
  return "No se pudo completar la solicitud. Revisa la conexión e inténtalo nuevamente.";
}
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "No se pudo completar la operación."; }
