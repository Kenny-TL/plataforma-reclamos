export const STAFF_ROLES = [
  "mesa_partes",
  "responsable_area",
  "supervisor",
  "administrador",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  mesa_partes: "Mesa de partes",
  responsable_area: "Responsable de área",
  supervisor: "Supervisor",
  administrador: "Administrador",
};
