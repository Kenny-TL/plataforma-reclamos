# Seguridad

Auditoría estática del código local con verificaciones remotas limitadas. No certifica seguridad de producción. Hallazgos y prioridades en [AUDIT_PHASE_0.md](AUDIT_PHASE_0.md).

## Controles existentes

| Capa | Control local |
|---|---|
| Navegador | Solo URL/clave pública/sitekey; no se encontró uso de service_role en `src` |
| Ciudadano | Edge, token Turnstile de un uso; Siteverify valida success, action y hostname |
| Consulta | DNI+código y límites HMAC por DNI/IP; vista pública excluye motivos/notas internas |
| Sesión | Supabase Auth; cookies SSR; Proxy más `getUser` y comprobación de perfil en servidor |
| Personal | Perfil activo, cuatro roles; área en RLS y RPC; sin signup frontend |
| Expediente | Escritura por procedimientos; transiciones y condiciones de cierre; historial inmutable |
| Archivos | Bucket privado según SQL; tamaño/MIME/extensión/firma en Edge ciudadana; URL firmada 300 s |
| Invitación | JWT comprobado con Auth y administrador activo; sin aceptar rol/activo en body |
| Worker | Comparación de apikey de servicio; canal correo; escape HTML |
| Secretos | `.env*` ignorado; claves de servicio/Resend/Turnstile solo runtime Edge según diseño |

Estos controles son evidencia local salvo catálogo y rechazos HTTP en TESTING. No se usaron contraseñas ni claves administrativas. La presencia de `.env.local` solo se informó por nombre de variable y estado no vacío.

## Riesgos que deben resolverse

1. **Auditoría (H01/C03):** captura completa de reclamos/respuestas y lectura por administrador contradicen su aislamiento anunciado. Solo `reclamantes` sanitiza valores a nombres de campos. Además, perfiles y textos libres pueden contener datos personales. Diseñar minimización y lectura sanitizada en backend antes de interfaz.
2. **Respuesta/Storage (H02):** INSERT del responsable valida bucket y prefijo de reclamo del área, sin vincular una metadata exacta en borrador. Confirmar archivo solo comprueba existencia y alcance. Un usuario podría introducir archivos sin metadata; verificar invariantes de estado, MIME/tamaño y objeto exacto.
3. **Carga ciudadana (H03):** metadata selecciona origen pero no lo restringe. Conocer UUID no debe permitir que ciudadano escriba documentos de respuesta. No se intentó explotación con expedientes reales.
4. **Correo (H04):** lease reduce concurrencia pero no garantiza idempotencia; falta clave al proveedor y vínculo durable de resultado externo. Timeout cron 15 s, lote secuencial 20 y timeout por envío 15 s requieren revisión conjunta. No habilitar programación sin verificar proveedor/remitente y comportamiento.
5. **Perfiles (H07):** RLS evita edición por empleado común, pero administrador tiene UPDATE amplio, incluido perfil propio; falta protección explícita del último administrador. Definir columnas, procedimiento y política de autoedición conforme al requisito.
6. **HTTP (H06):** CORS por defecto `*`; no hay comprobación servidor de Origin. El preflight localhost fue correcto, pero CORS no autentica clientes. Content-Length no es límite suficiente del cuerpo recibido; multipart se materializa antes de validar tamaño. Los errores Edge pueden devolver mensajes internos y logs de proveedor sin sanitización uniforme.
7. **Cliente (H08/H09):** esperas Turnstile indefinidas, widgets sin remove al desmontar, contratos convertidos sin validar todos sus campos; anexos parciales sin recuperación. No almacenar DNI/código ni URLs firmadas persistentemente.

La IP se toma de cabeceras proxy y se reenvía a PostgREST: verificar qué cabeceras sobrescribe el gateway antes de certificar límite por IP. El código de autenticación no comprueba `areas.activa`; acordar ese requisito. Metadatos, catálogo de feriados y plazos semilla no equivalen a configuración institucional aprobada.

## Verificaciones remotas pendientes

Revisar configuración efectiva de RLS/grants, esquema `privado` fuera de API, revocaciones de cuatro RPC ciudadanas, bucket privado, MIME/tamaño, `verify_jwt`, Auth sin registro público, SMTP/redirects y secretos por nombre. No mostrar valores secretos ni usar endpoints de gestión desde navegador.

Probar cuentas reales autorizadas de cada rol en entorno controlado: acceso a otra área, UUID manipulado, RPC directa, inactive durante sesión, reintento/doble click, archivos no permitidos, respuesta después de aprobar, URL expirada y acceso por auditoría. Registrar resultados sin DNI, documentos ni tokens. No se crearon usuarios para esta auditoría.

Cualquier corrección de funciones, triggers, políticas o permisos requiere explicar necesidad/objetos, proponer SQL, evaluar impacto/riesgo y obtener autorización antes de ejecutar. No se prepararon ni aplicaron migraciones correctivas en Fase 0.
