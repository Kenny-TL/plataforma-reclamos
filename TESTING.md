# Pruebas — Fase 0

Fecha: 05/11/2026. Entorno: Windows/PowerShell, dependencias instaladas, `.env.local` existente. No se crearon datos, usuarios ni correos de prueba. Se evitaron llamadas ciudadanas con DNI/código real y cualquier RPC con escritura.

## Resultados ejecutados

| Tipo | Comprobación | Resultado |
|---|---|---|
| Inventario | `npm ls --depth=0` | Salida 0; versiones declaradas principales instaladas; 2 paquetes extraneous |
| Estática | `npm run lint` | Salida 0, sin errores reportados |
| Tipos | `npx --no-install tsc --noEmit --incremental false` | Salida 0, sin diagnósticos; sin reescribir tsbuildinfo |
| Compilación | `npm run build` dentro de sandbox | Compila; falla al lanzar verificador por `spawn EPERM` |
| Compilación | Repetición autorizada fuera de sandbox | Salida 0; rutas `/`, `/_not-found`, `/admin`, `/login` y Proxy |
| HTTP producción local | GET `/` | 200 y formulario presente en HTML |
| HTTP producción local | GET `/login` | 200 y formulario de acceso presente |
| Seguridad ruta, sin sesión | GET `/admin` y `/admin/reclamos` | 307 a `/login?reason=session`; sin perfil privado en HTML |
| Integración remota de lectura | POST Edge portal `accion=catalogos` | 200, ok=true, data.areas/categorias/limites; 5 áreas y 5 categorías |
| Integración remota de lectura | POST RPC rpc_catalogos_portal con apikey pública | 200, mismas claves principales |
| Seguridad remota limitada | Portal registrar/consultar/subsanar sin token | 403 en los tres casos; sin enviar identidades ni datos de negocio |
| Validación remota limitada | Anexos con JSON vacío | 400; no prueba CAPTCHA de carga/descarga |
| Autorización remota limitada | Crear-personal sin sesión JWT | 401; no prueba permisos con usuario autenticado |
| Autorización remota limitada | Enviar-notificaciones con clave pública | 401; no se tomó cola ni se envió correo |
| CORS remoto | OPTIONS portal con Origin localhost:3000 | 200, allow-origin localhost:3000, métodos POST/OPTIONS |
| Introspección remota | GET raíz PostgREST con clave pública | 401 con/sin Bearer; no permitió inventario de esquema |
| Integridad de copias SQL | SHA-256 entre las dos carpetas de originales | Coinciden 16 SQL y README |
| Integridad de implementación | Huella SHA-256 conjunta de src, dependencias declaradas/lock y configuración antes/después de documentación | Coincide; implementación y cambios locales previos conservados |
| Documentación | Enlaces locales, caracteres de reemplazo, cierre de bloques y `git diff --check` | 11 documentos revisados, sin enlaces rotos ni errores de estas comprobaciones |

Los endpoints se resolvieron desde `.env.local`; no se copiaron URL del proyecto ni valores de claves al informe. No hay script `test`, suites propias ni CI en los archivos inspeccionados.

El servidor de comprobación se inició con `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`. El intento previo mediante `npm run start -- --hostname ... --port ...` perdió los flags en este entorno PowerShell/npm y terminó con directorio inválido; el comando directo resolvió la prueba. Se utilizó 3100 para no intervenir un posible servidor del usuario en 3000. El proceso de auditoría se detuvo al finalizar.

No se realizó QA visual en navegador, prueba de accesibilidad automatizada, rendimiento, EXPLAIN, escaneo de dependencias ni pentest. Las comprobaciones HTTP de HTML no prueban hidratación, funcionamiento del widget ni diseño móvil. El 307 de `/admin/reclamos` comprueba el matcher; esa página no existe en la implementación actual.

## Límites de interpretación

Lint/tipos/build correctos no acreditan persistencia ni seguridad RLS. Rechazar un token ausente no acredita aceptar tokens válidos o rechazar hostname/action incorrectos. 401 sin sesión no acredita todos los permisos. Catálogos 200 no prueban que migración, bucket, cola o perfil coincidan con SQL local. La seguridad sensible descrita en SECURITY proviene de inspección, no explotación remota.

## Matriz pendiente por fases

| Área | Casos positivos | Casos negativos/seguridad |
|---|---|---|
| Portal | Registrar y recuperar el mismo código; datos opcionales | Campos ausentes, longitud, fecha Lima futura, doble envío, fallo posterior a registro |
| Turnstile | Token válido nuevo por operación y archivo | Ausente/usado/vencido, hostname/action ajenos, red caída, desmontaje, timeout |
| Anexos | PDF/JPEG/PNG exactos y URL firmada vigente | Tamaño 0/excesivo, extensión/MIME/firma discordantes, UUID ajeno, origen respuesta en carga ciudadana, expiración, concurrencia |
| Seguimiento | DNI+código del titular, historial/observación/respuesta pública | Código ajeno/erróneo, límite de intentos, notas internas no expuestas |
| Auth | Credencial autorizada, logout local, renovar/expirar sesión | Sin perfil, inactivo, área ausente/ajena, revocación durante sesión, acceso directo a rutas/datos |
| Personal | Invitación aceptada y perfil inicialmente inactivo | JWT no admin, payload rol/área/activo, autoedición, último administrador, duplicado de correo |
| Bandeja | Filtros/orden/paginación y detalle del ámbito | Responsable lee otra área, administrador lee expedientes, exposición de reclamante |
| Operaciones | Derivar, reasignar y mantener historial/plazo | Área inactiva, transición inválida, falta motivo, solicitud duplicada |
| Respuesta | Borrador→aprobación→notificación→cierre | Redacción ajena, adjuntar después de aprobación, confirmar objeto incorrecto, cerrar sin notificar |
| Subsanación | Presentación con texto/anexos y retorno a revisión | Sin observación, vencida, doble presentación, exceso acumulado y fallos de carga |
| Correo | Remitente verificado, entrega y resultado guardado | Fallo proveedor/BD, reintento, duplicado, lease vencido, timeout cron, SMS no reclamado |
| Reportes | Datos reales y fórmulas documentadas; vacíos | Roles no autorizados, filtros inválidos, exportación masiva, CSV con fórmulas peligrosas al implementarlo |
| Auditoría/configuración | Eventos trazables y cambios autorizados | Modificar/eliminar bitácora, fuga de PII al administrador, cambiar parámetros sin permiso |

Ejecutar estas pruebas en entorno autorizado con cuentas/datos controlados antes de declarar terminadas las fases. Reutilizar cuentas existentes cuando corresponda; esta fase no autoriza crear cuentas de prueba. No registrar DNI, contraseñas, tokens, URLs firmadas ni contenido de documentos en evidencias compartidas.
