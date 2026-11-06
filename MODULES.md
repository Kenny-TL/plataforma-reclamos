# Módulos y dependencias

Inventario al 05/11/2026. Backend local no equivale a ejecución certificada. Evidencia en [TESTING.md](TESTING.md).

| Módulo | Frontend actual | Backend local reutilizable | Pendiente/dependencia |
|---|---|---|---|
| Registro | Formulario y confirmación | Edge portal y RPC registro | Persistencia real y manejo de fallos parciales |
| Anexos ciudadanos | Selección/validación/subida secuencial | Edge anexos y Storage | Reintentos sin duplicar reclamo; H02/H03 |
| Seguimiento | Historial, área, observación, respuesta y descarga | RPC consulta y ruta segura | CAPTCHA válido, descarga y expiración reales |
| Subsanación | Solo muestra observación | Edge subsanar y RPC | Crear formulario; confirmar límite acumulado |
| Auth | Login/logout, Proxy y guard | Auth y perfiles | Sesión real, inactivos, expiración, invitación/recuperación |
| Usuarios | Sin gestión | crear-personal y update perfiles por RLS | Listado/edición/activación; SMTP y autoedición |
| Roles/permisos | Constante de cuatro roles | Enum, RLS, transiciones | Sin catálogo granular editable; no inventarlo |
| Dashboard | Sin implementar | rpc_indicadores | Supervisor/administrador; vacíos y filtros reales |
| Reclamos | Admin solo perfil | v_bandeja_reclamos y rpc_detalle_reclamo | Búsqueda, filtros, orden y rango; privacidad |
| Derivación | Sin implementar | Ejecutar acción, resolver reasignación, sugerencia | Asignación por área; no individual |
| Atención/respuesta | Sin implementar | Actuaciones, borrador, anexos y acciones | Corregir seguridad archivos; redacción/aprobación separadas |
| Estados/plazos | Estado público | 15 estados, transiciones y días hábiles | Botones según contrato; sin estados nuevos |
| Notificaciones | Sin implementar | Worker, cola, reintentos y canal manual | Proveedor/remitente/cron e idempotencia; SMS apagado |
| Reportes | Sin implementar | Indicadores y exportación tabular | CSV/Excel/PDF y lotes; sin datos ficticios |
| Auditoría | Sin implementar | Triggers y tablas inmutables | Resolver visibilidad por rol |
| Configuración | Sin implementar | Áreas, categorías, reglas, parámetros, feriados, plantillas | Edición restringida y validación institucional |
| Seguridad | Controles iniciales | RLS/checks/RPC/Storage | Verificación remota y matriz por rol/área |
| UX | Portal responsive, labels, cargas/alertas | No aplica | Idioma HTML/metadata, teclado/móvil y coherencia |
| Inteligencia | Sin módulo específico | Reglas deterministas categoría→área | No existe inferencia de IA; definir alcance si se requiere |

Dependencia principal: contratos confirmados → servicios/tipos → auth/permisos → bandeja/detalle → derivación → atención/respuesta → subsanación → notificaciones → reportes → auditoría/configuración → pruebas/despliegue autorizado. Dashboard y personal dependen de auth. Revisar seguridad antes de cualquier módulo afectado; conservar procedimientos existentes. Plan detallado en [AUDIT_PHASE_0.md](AUDIT_PHASE_0.md).
