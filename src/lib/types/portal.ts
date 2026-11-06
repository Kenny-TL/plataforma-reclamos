export type CatalogItem = { id: number; nombre: string };
export type CatalogLimits = { max_anexos: number; max_anexo_bytes: number; formatos: string[]; descripcion_min: number; descripcion_max: number; plazo_dias_habiles: number };
export type CatalogData = { areas: CatalogItem[]; categorias: CatalogItem[]; limites: CatalogLimits };
export type RegisteredAttachment = { id: string; nombre_archivo: string; storage_path: string };
export type Registration = { id: string; codigo: string; fecha_registro: string; estado: string; anexos: RegisteredAttachment[] };
export type TrackingResult = {
  ok: boolean; codigo: string; fecha_registro: string; asunto: string; estado: string; area: string;
  historial: Array<{ evento: string; fecha: string }>;
  observacion: { texto: string; plazo: string } | null;
  respuesta: { asunto: string | null; contenido: string | null; conclusion: string | null; fecha: string | null; anexos: Array<{ id: string; nombre: string }> } | null;
  mensaje?: string; anexos?: RegisteredAttachment[];
};
export type PortalEnvelope<T> = { ok?: boolean; data?: T; error?: string; details?: string };
export type DownloadEnvelope = { ok?: boolean; url?: string; expires_in?: number; nombre_archivo?: string; error?: string };
