# Historial de cambios

## 05/11/2026 — Fase 0, auditoría y documentación

- Creado informe con alcance, evidencia, contradicciones C01–C06, hallazgos H01–H12 y propuesta de fases 1–13.
- Documentados arquitectura, módulos, cuatro roles, esquema local, estados, contratos Edge/RPC, seguridad, pruebas y preparación de despliegue.
- Actualizado README con estado real e índice documental.
- Verificados lint, TypeScript y build; build necesitó repetición fuera del sandbox tras `spawn EPERM`.
- Verificados HTTP de producción local, catálogos reales y rechazos remotos sin identidad/sesión/CAPTCHA; sin crear datos de negocio.
- Conservados cambios locales previos de autenticación, dependencias y página pública. No se implementaron funciones, cambiaron dependencias, ejecutaron SQL, modificaron migraciones, desplegaron Edge, crearon usuarios ni enviaron notificaciones.

La base remota, RLS, Storage, Auth/SMTP, Resend y jobs no se certificaron administrativamente. Fase 1 pendiente de autorización expresa del solicitante. El detalle y las limitaciones de las pruebas están en [TESTING.md](TESTING.md).
