# Auditoría — Fase 0

Fecha: **05/11/2026**, America/Lima. Municipalidad Distrital de Pillco Marca.

## Dictamen y límites

Existe un portal público integrado y una base inicial de autenticación municipal. La mayor parte del panel operativo está pendiente en frontend; el SQL local ya implementa buena parte del negocio. No corresponde recrear procedimientos ni introducir roles/estados automáticamente.

Se entrega la **auditoría del código disponible con verificación remota parcial**. No se certifica el entorno desplegado completo ni aptitud para producción. Las contradicciones y riesgos siguientes se presentan antes de modificar la implementación. La Fase 1 no se inició.

El solicitante informa que la conexión y los SQL fueron probados/ejecutados anteriormente. Es un antecedente aportado, no prueba de la versión desplegada. Hay metadatos de enlace CLI, pero no se obtuvo una conexión administrativa de base de datos ni una sesión de gestión Supabase mediante las herramientas disponibles. No se inspeccionaron definiciones efectivas de tablas, RPC, RLS, buckets, secretos, Auth/SMTP, cron ni historial remoto de migraciones.

La raíz OpenAPI de PostgREST devolvió 401, incluso con apikey pública sin Bearer; no demuestra ausencia de tablas/RPC, pues la RPC de catálogos respondió 200. No se emplearon credenciales de servicio ni se leyeron datos de ciudadanos.

## Alcance y método

Se inspeccionaron todos los archivos fuente de `src`, configuración, dependencias declaradas/instaladas, README, AGENTS.md, nombres/presencia de variables locales, ejemplos frontend, las cuatro Edge Functions y tres helpers, scripts SQL 01–15 y 99, la migración de endurecimiento y SQL 17 de programación. Los SQL se **leyeron**, nunca se ejecutaron.

Los 16 SQL y el README original coinciden por SHA-256 entre `../supabase_reclamos/` y `../supabase_reclamos_implementation/sql-originales/`. Los ZIP son paquetes de distribución: se revisaron las carpetas extraídas. `.next`, dependencias y cachés no son implementación propia. Se consultaron las guías instaladas de Next sobre autenticación, Proxy y cookies, además de `generate-agent-files.js`; se conservó AGENTS.md.

Fuentes locales principales: `src/components/claim-*`, `turnstile-loader`, `staff-*`; `src/lib/auth/*`, `src/lib/supabase/*`, páginas y Proxy; `../supabase_reclamos_implementation/README_IMPLEMENTACION.md`, `supabase/functions/**`, `sql-originales/*.sql`, `supabase/migrations/20261104_edge_hardening_sms_off.sql`, `supabase/sql/17_programar_notificaciones.sql`.

| Evidencia | Alcance |
|---|---|
| Inspección de código/SQL | Implementación local; no acredita versión remota |
| Lint, tipos y build | Calidad estática/compilación; no acredita persistencia ni permisos |
| HTTP real limitado | Catálogos y rechazos sin crear datos de negocio |
| Pendiente | Prueba con sesión, CAPTCHA válido, configuración privada o esquema efectivo |

## Funcionalidades existentes y pendientes

| Funcionalidad | Resultado |
|---|---|
| Catálogos | Edge y RPC: 200 real; 5 áreas, 5 categorías y límites compatibles con formulario |
| Registro | Formulario con campos del contrato, declaración, validación y llamada Edge; pendiente persistencia positiva |
| Anexos ciudadanos | Metadata y subida secuencial con token nuevo por archivo; pendiente carga real y recuperación de fallos |
| Consulta | DNI+código, historial público, observación, respuesta y descarga firmada; pendiente consulta con CAPTCHA válido |
| Subsanación | Acción Edge y RPC existentes; sin formulario frontend |
| Login/logout | Auth por contraseña, comprobación de perfil activo/rol y salida local; pendiente cuenta real y expiración |
| Protección | Proxy para `/admin/:path*` y guard servidor en `/admin`; redirección anónima 307 comprobada |
| Panel | Solo bienvenida/perfil. Sin bandeja, indicadores, usuarios ni acciones de expediente |
| Negocio municipal | RPC, vistas, transiciones, plazos y triggers locales reutilizables; versión desplegada no verificada |
| Correo | Worker Resend, cola/reintentos y cron propuesto; proveedor, remitente y entrega sin verificar |
| Auditoría/configuración | Tablas, triggers y políticas locales; sin interfaz; revisar acceso por auditoría |

Inventario ampliado en [MODULES.md](MODULES.md). No se declara un módulo operativo de extremo a extremo solo por su código o interfaz.

## Contradicciones que requieren decisión

| ID | Diferencia | Decisión previa a implementación |
|---|---|---|
| C01 | README SQL original recomienda RPC ciudadanas directas con anon; migración posterior revoca cuatro de ellas | Verificar grants efectivos; conservar llamadas actuales por Edge y tratar README original como histórico |
| C02 | Paquete de implementación declara que no se ejecutó contra proyecto real; solicitante informa ejecución previa | Contrastar versiones/migraciones sin repetir SQL |
| C03 | Administrador se documenta sin acceso a reclamos individuales; RLS de auditoría le permite leer filas con contenido de reclamos y respuestas | Definir sanitización/visibilidad efectiva antes de mostrar auditoría |
| C04 | README habla de límites por registro/subsanación/respuesta; trigger cuenta por reclamo+origen, acumulando todas las subsanaciones | Confirmar límite acumulado o por presentación y respetar contrato confirmado |
| C05 | Propuesta incluye más roles, permisos granulares y asignación individual; SQL real tiene cuatro roles y asignación por área | Conservar modelo; extensiones requieren diseño/aprobación independientes |
| C06 | README de implementación dice que ID de Resend queda en logs; worker lo incluye en respuesta, sin log explícito ni columna dedicada | Confirmar trazabilidad efectiva del proveedor antes de operar notificaciones |

**No se corrigió código, SQL, migraciones ni políticas al detectar estas diferencias.** La documentación expone los problemas para revisión previa, como pide el solicitante.

## Hallazgos priorizados

Severidad por impacto potencial en el código local; no equivale a explotación demostrada en producción.

| ID | Prioridad | Evidencia | Riesgo y propuesta, sin ejecutar |
|---|---|---|---|
| H01 | Alta | SQL 07 `fn_auditar`, SQL 12 `auditoria_select` | Administrador puede leer contenido individual por auditoría, incluidos textos potencialmente personales. Diseñar sanitización/restricción backend; ocultar columnas en UI no corrige acceso |
| H02 | Alta | SQL 13 `anexos_responsable_insert`; SQL 10 `rpc_confirmar_anexo_respuesta` | Storage permite insertar bajo cualquier ruta de reclamo del área sin metadata exacta de respuesta en borrador. Confirmar no revalida borrador, MIME/tamaño/contenido. Endurecer antes de respuestas |
| H03 | Alta | Edge `anexos/index.ts:58` | Selecciona `origen` sin validarlo. Ciudadano con DNI+código y UUID de metadata pendiente podría cargar un documento de respuesta. Restringir a registro/subsanación y probar aisladamente |
| H04 | Alta | Worker, migración de cola, SQL 17 | Sin idempotencia Resend: éxito de envío y fallo al guardar permite duplicación. 20×15 s puede consumir lease de 5 min y supera timeout HTTP de cron de 15 s. Revisar lote, idempotencia y resultados |
| H05 | Alta, pendiente | Sin introspección administrativa remota | No se certifican RLS efectiva, revocaciones, privacidad bucket, registro público deshabilitado ni configuración de secretos. Verificar antes de pruebas positivas/despliegue |
| H06 | Media | Helpers HTTP y errores Edge | Fallback CORS `*`, sin rechazo servidor de Origin; límite portal depende de Content-Length; multipart se parsea antes de validar tamaño. Aplicar límites efectivos y política de orígenes |
| H07 | Media | SQL 12 `perfiles_admin_update`; crear-personal | Administrador puede editar perfiles ampliamente; sin barrera explícita para autoedición de rol o último administrador. Invitación sin flujo frontend de aceptación/contraseña. Definir procedimiento y comprobar SMTP/redirects |
| H08 | Media | Esperas Turnstile de ambos componentes | Sin timeout/cancelación ni eliminación del widget al desmontar. Cargas parciales sin reintento UI. Recuperar anexos sin repetir reclamo registrado |
| H09 | Media | Tipos y llamadas en componentes | Contratos duplicados, respuestas convertidas sin validación completa y errores heterogéneos. Extraer servicios/tipos/validaciones sin cambiar payloads |
| H10 | Media | Detalle y exportación RPC | Agregados completos por expediente y exportación sin límite interno. Bandeja sí admite rango. Acotar consultas y definir exportación por lotes |
| H11 | Baja | Layout y campo fecha | `lang=en`, metadata de Create Next App y fecha máxima UTC en vez de Lima. Corregir en fase autorizada |
| H12 | Media | Git y estructura física | Auth/panel sin seguimiento; backend fuera del repo; sin CI ni suites propias. Acordar versionado y preservar cambios existentes |

Otros límites: el guard comprueba existencia de área pero no `areas.activa`; recuperación de contraseña, callback Auth, eventos explícitos de login/logout y exportación de archivos no existen. No hay inferencia de IA: la sugerencia de área usa reglas deterministas. El SQL llama ejemplos a catálogos/plazos/feriados; no se certifica aprobación institucional ni vigencia legal.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| Dependencias instaladas | Versiones principales presentes; extraneous `@emnapi/runtime` y `@img/sharp-wasm32`, sin eliminar |
| `npm run lint` | Correcto, salida 0 |
| `npx --no-install tsc --noEmit --incremental false` | Correcto, salida 0; evita modificar tsbuildinfo |
| `npm run build` | Correcto, salida 0 tras repetición autorizada fuera del sandbox; primer intento `spawn EPERM` en verificador |
| HTTP local producción | `/` y `/login`: 200. `/admin` y `/admin/reclamos` sin sesión: 307 a login |
| Edge sin token | `registrar`, `consultar`, `subsanar`: 403 |
| Edge sin autorización | crear-personal y enviar-notificaciones: 401; anexos vacío: 400 |
| CORS real | Preflight 200, origen permitido localhost:3000; solo se probó ese origen |

No se probaron CAPTCHA válido, cuentas activas/inactivas, IDOR, MIME, persistencia ni entrega de correo. El 307 de `/admin/reclamos` prueba el matcher, **no existencia de página**. Detalles: [TESTING.md](TESTING.md).

## Propuesta ordenada y criterios de salida

| Fase | Entregable | Dependencia/aceptación |
|---|---|---|
| 0 | Auditoría y mapa actuales | Entrega documental; límites remotos y decisiones pendientes explícitos |
| 1 | Servicios ciudadanos, tipos, validaciones y errores compartidos; idioma/fecha | Autorización expresa; contratos conservados y regresión portal |
| 2 | Completar/verificar auth existente e invitación/recuperación si configuradas | Auth/SMTP/redirects confirmados; sesión real, inactivos y expiración |
| 3 | Usuarios según cuatro roles y Edge existente | Resolver H07, comprobar RLS, sin permisos inventados |
| 4 | Dashboard real con `rpc_indicadores` | Solo supervisor/administrador; vacíos y fórmulas reales |
| 5 | Bandeja y detalle, búsqueda/filtros/orden/rango | RLS por rol/área y acceso directo ajeno denegado |
| 6 | Derivación/reasignación existentes | Estados reales; asignación individual fuera hasta aprobar extensión |
| 7 | Actuaciones, observación, borrador/aprobación/cierre | Resolver H02/H03; cierre exige respuesta notificada |
| 8 | Subsanación y recuperación de cargas | Confirmar C04; estado/plazo/token por carga |
| 9 | Notificaciones y reintentos | Resolver H04; verificar proveedor/remitente antes de cron; SMS apagado |
| 10 | Reportes/exportación sin DNI/contactos | Lotes y alcance real; filtros/métricas nuevos requieren contrato |
| 11 | Auditoría/configuración | Resolver C03/H01 antes de interfaz y confirmar modificaciones críticas |
| 12 | Integración, accesibilidad y seguridad | Demostrar roles, archivos, plazos, notificaciones y escenarios negativos |
| 13 | Manuales y preparación para despliegue | Pruebas aceptadas, backend versionado y aprobación separada para publicar |

Cada fase debe verificar contratos/archivos/pruebas antes de comenzar y cerrar con pruebas funcionales pertinentes, no solo compilación. Si precisa cambios backend: presentar necesidad, objetos afectados, SQL propuesto, impacto y riesgos; esperar autorización antes de ejecutarlos. Esta auditoría identifica necesidades y no aplica SQL correctivo.

## Informe de cierre de esta entrega

1. **Objetivo:** auditar y documentar sin iniciar desarrollo.
2. **Auditoría:** frontend completo, backend local y HTTP limitado descritos arriba.
3. **Funcionalidades desarrolladas:** ninguna; inventario de las existentes.
4. **Archivos creados:** AUDIT_PHASE_0, ARCHITECTURE, MODULES, SECURITY, ROLES_AND_PERMISSIONS, DATABASE, API_CONTRACTS, TESTING, DEPLOYMENT y CHANGELOG, todos Markdown.
5. **Archivo modificado:** README.md. Código y cambios locales previos conservados.
6. **Dependencias agregadas:** ninguna.
7. **Integraciones nuevas:** ninguna; se comprobaron endpoints existentes.
8. **Tablas/funciones/contratos:** inventario en DATABASE y API_CONTRACTS; solo catálogos usados positivamente en remoto.
9. **Permisos usados:** clave pública; sin sesión municipal, service_role ni credenciales administrativas.
10. **Pruebas:** estáticas, compilación, HTTP local y remoto limitado; sin suite funcional completa.
11. **Lint:** correcto.
12. **TypeScript:** correcto.
13. **Build:** correcto fuera del sandbox tras EPERM inicial.
14. **Problemas:** C01–C06 y H01–H12.
15. **Riesgos pendientes:** backend/despliegue sin certificar; resolver hallazgos antes de módulos afectados.
16. **Próxima fase:** Fase 1, pendiente de autorización expresa según la instrucción inicial del solicitante. No se desplegó, ejecutó SQL, creó personal ni envió correo.
