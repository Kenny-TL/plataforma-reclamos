import type { CatalogLimits } from "../types/portal";
export const FILE_MIMES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
export function validateFiles(files: Array<Pick<File, "name" | "size" | "type">>, limits: Pick<CatalogLimits, "max_anexos" | "max_anexo_bytes" | "formatos">): string | null {
  if (files.length > limits.max_anexos) return `Puedes adjuntar hasta ${limits.max_anexos} archivos disponibles.`;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!limits.formatos.includes(ext) || FILE_MIMES[ext] !== file.type) return `${file.name}: formato o MIME no permitido. Usa PDF, JPG o PNG.`;
    if (file.size < 1 || file.size > limits.max_anexo_bytes) return `${file.name}: tamaño fuera del límite permitido (${Math.floor(limits.max_anexo_bytes / 1024 / 1024)} MB).`;
  }
  return null;
}
