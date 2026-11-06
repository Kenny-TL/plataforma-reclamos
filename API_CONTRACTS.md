# Contratos API existentes

Contrato reconstruido del código local al 05/11/2026. No sustituye la comprobación de la versión desplegada. Las pruebas reales figuran en [TESTING.md](TESTING.md). No llamar al worker desde frontend.

## Portal ciudadano

`supabase.functions.invoke('portal-ciudadano', { body })`, POST JSON. OPTIONS para CORS. `verify_jwt=false` en configuración local; autenticación ciudadana se aplica dentro de la función.

| accion | Campos de body | Retorno |
|---|---|---|
| catalogos | Solo accion | `{ok:true,data:{areas,categorias,limites}}` |
| registrar | datos, turnstile_token | `{ok:true,data:{id,codigo,fecha_registro,estado,anexos}}` |
| consultar | dni, codigo, turnstile_token | `{ok:true,data:VistaPublica}` o data con ok=false/error/mensaje |
| subsanar | dni, codigo, texto, anexos opcional, turnstile_token | `{ok:true,data:VistaPublica + anexos creados}` o data con ok=false/error/mensaje |

`catalogos` no exige CAPTCHA; las otras tres acciones sí. Token con action `portal-ciudadano` y hostname de allowlist. Cada petición requiere token nuevo, también las cargas/descargas. El límite local del cuerpo de portal es 256 KiB comprobado mediante Content-Length; revisar H06.

### Payload datos del registro

| Objeto | Obligatorios según RPC | Opcionales |
|---|---|---|
| ciudadano | nombres, apellido_paterno, apellido_materno, numero_documento, domicilio, distrito, provincia | referencia, celular, correo |
| reclamo | asunto, categoria_id, lugar, descripcion, solucion | subcategoria, fecha_hechos, area_orientativa_id |
| Raíz datos | ciudadano, reclamo, acepta_declaracion=true | anexos, array vacío por defecto |

DNI de 8 dígitos. Celular, cuando existe, 9 dígitos empezando en 9. Correo opcional con formato válido. Descripción según límites de catálogo (actualmente 30–2000); CHECK de tabla también fija 30–2000. Categoría activa; fecha no futura según Lima. Subcategoría es texto, no FK. Una declaración aceptada establece las dos aceptaciones persistidas: veracidad y tratamiento.

Cada metadata de anexo: `{nombre,nombre_archivo,mime_type,tamano_bytes}`. Registro devuelve, en orden, `{id,nombre_archivo,storage_path}`; el binario no se incluye. Crear metadata y subir archivo son operaciones separadas: un fallo de subida no revierte registro confirmado.

`limites`: `max_anexos`, `max_anexo_bytes`, `formatos`, `descripcion_min`, `descripcion_max`, `plazo_dias_habiles`. Respuesta real observada: 5 archivos, 5242880 bytes, pdf/jpg/jpeg/png, 30–2000 caracteres y plazo 15. Son configuración observada, no norma legal.

### Vista pública

Campos: `ok`, `codigo`, `fecha_registro` (fecha Lima), `asunto`, `estado` público, `area`, `historial:[{evento,fecha}]`, `observacion:{texto,plazo}|null`, `respuesta:{asunto,contenido,conclusion,fecha,anexos:[{id,nombre}]}|null`.

Historial solo `visible_publico`; nunca motivos internos. Observación pendiente solo en observado/pendiente_subsanacion. Respuesta visible en respondido/cerrado/archivado si está aprobada/notificada; anexos solo cargados. Fechas de historial son texto local `YYYY-MM-DD HH24:MI`; no reinterpretarlas como UTC. UI las representa DD/MM/AAAA.

Subsanar exige observación pendiente, estado permitido, texto no vacío y plazo no vencido. Registra subsanación, marca observación subsanada y vuelve a en_revision; no crea estado nuevo. Devuelve metadata de anexos para posterior carga. El frontend actual **no invoca subsanar**.

### Errores

405 método; 413 Content-Length excesivo; 400 acción/datos/RPC inválidos; 403 CAPTCHA; 500 excepción. Error Edge puede ser `{error,details}`; details SQL puede contener JSON de errores por campo. En consulta/subsanación también existe fallo de negocio dentro de HTTP 200 con `data.ok=false`: comprobar ambos niveles. La UI de consulta no debe asumir que todo HTTP 200 implica reclamo encontrado.

## Anexos

POST `anexos`, `verify_jwt=false`. Solo ciudadano; cargas municipales de respuesta siguen un flujo diferente.

| Acción | Entrada | Salida |
|---|---|---|
| subir | multipart: accion, dni, codigo, anexo_id, turnstile_token, archivo File | `{ok:true,anexo_id,storage_path}` |
| descargar-respuesta | JSON: accion, dni, codigo, anexo_id, turnstile_token | `{ok:true,url,expires_in:300,nombre_archivo}` |

Subida: RPC consulta valida DNI+código; busca metadata del reclamo no cargada; compara tamaño/MIME y prefijo/extensión; valida firma PDF/JPEG/PNG; upload `upsert:false`; marca cargado. Si falla UPDATE intenta retirar binario. Código se consulta literalmente después de autenticación: normalizar consistentemente al agregar nuevas interfaces.

La función local permite 1 byte–5 MiB, PDF/JPEG/PNG. Selecciona origen sin restringirlo: H03. La respuesta de subida contiene ruta privada, pero no es URL pública. Descarga obtiene ruta exclusivamente mediante `rpc_ruta_anexo_respuesta` y firma por 300 s. No aceptar rutas arbitrarias desde UI.

Errores: 400 datos/formato/tamaño/firma; 403 CAPTCHA/identidad; 404 metadata/documento; 409 ya cargado; 500 Storage/excepción. No se probaron cargas positivas ni firmas reales en Fase 0.

## Personal

Auth navegador: `signInWithPassword({email,password})`, después lectura de perfil propio. Logout: `signOut({scope:'local'})`; no cierra otras sesiones. Guard servidor: `auth.getUser()` + consulta de perfil. No existe registro público frontend ni recuperación/callback implementados.

POST `crear-personal`: `verify_jwt=true`, JWT de usuario y comprobación explícita `getUser(jwt)` + administrador activo. Body `{email,nombres,apellidos}`. Usa `inviteUserByEmail` y metadata de nombres; perfil nace mesa_partes/inactivo/sin área por trigger.

201: `{ok,mensaje,user_id,email,perfil_inicial:{rol,activo,area_id}}`. 401 sin sesión; 403 no administrador activo; 400 body/invitación inválida; 500 excepción. No admite asignar rol/área/activo. La aceptación de invitación y SMTP son dependencias pendientes.

## Panel: vistas y RPC

Solo sesión authenticated y comprobaciones backend. Fuente SQL 09–12. La implementación frontend de estas operaciones está pendiente.

| Recurso | Parámetros/uso | Alcance |
|---|---|---|
| v_bandeja_reclamos | select columnas; ilike codigo/asunto; eq estado_codigo/area_id/categoria_id; fechas; order + range | Lectura RLS; DNI enmascarado, reclamante reservado para responsable |
| v_plazos | Código/área/estado/vencimiento/días/alerta, filtros y rango | Lectura RLS |
| rpc_detalle_reclamo | p_reclamo_id uuid | Resumen, reclamante, descripción, anexos, historial, derivaciones, observaciones, reasignaciones, actuaciones, respuesta, notificaciones, auditoría, acciones; null si inaccesible |
| rpc_ejecutar_accion | p_reclamo_id, p_accion, p_motivo=null, p_datos={} | Rol/área/transición y requisitos; `{ok,estado}` |
| rpc_resolver_reasignacion | p_reasignacion_id, p_aprobar boolean, p_motivo | Mesa/supervisor; `{ok}` |
| rpc_sugerir_area | p_categoria_id integer | Perfil activo, retorna ID de área sugerida o null |
| rpc_registrar_actuacion | p_reclamo_id, p_texto | Supervisor o responsable del área; `{ok}` |
| rpc_guardar_borrador_respuesta | p_reclamo_id, p_asunto, p_contenido, p_conclusion | Responsable, atención/elaboración; `{ok,respuesta_id}` |
| rpc_registrar_anexo_respuesta | p_reclamo_id, p_nombre, p_nombre_archivo, p_mime_type, p_tamano_bytes bigint | Responsable y borrador; `{id,storage_path}` |
| rpc_confirmar_anexo_respuesta | p_anexo_id | Responsable del área y objeto existente; `{ok}`; limitaciones H02 |
| rpc_registrar_fallo_notificacion | p_id, p_error=null | Mesa/supervisor; `{ok}` |
| rpc_reintentar_notificacion | p_id | Mesa/supervisor; fallida→pendiente, intentos=0; SQL admite sms, migración no lo procesa |
| rpc_registrar_notificacion_manual | p_reclamo_id, p_canal, p_detalle, p_tipo='respuesta' | Mesa/supervisor; teléfono/presencial/otro; `{ok,id}` |
| rpc_indicadores | p_desde=null, p_hasta=null, p_area_id=null | Supervisor/administrador; kpis, por_categoria, por_estado, por_area, evolucion |
| rpc_exportar_reclamos | mismos tres filtros | Filas por código sin DNI/contactos; sin límite interno |

`p_datos` por acción: confirmar_categoria→`{categoria_id}`; registrar_observacion→`{texto}`; derivar→`{area_id}`; solicitar_reasignacion→`{area_sugerida_id}` opcional. Otras acciones usan motivo y transición. Aprobar reasignación debe usar RPC específica.

Anexo municipal: registrar metadata → upload Storage con sesión del responsable → confirmar. No usar la Edge ciudadana para esa carga. Revisar H02 antes de exponer el flujo.

`rpc_indicadores` no admite categoría ni devuelve tiempo por área; no presentar esos filtros/métricas como existentes. `rpc_exportar_reclamos` no genera CSV/XLSX/PDF: retorna tabla. Fórmulas y estados en [DATABASE.md](DATABASE.md).

## Worker interno

POST `enviar-notificaciones`, `verify_jwt=false`, exige cabecera apikey exactamente igual a clave de servicio obtenida del runtime. No usar desde navegador. Toma lote `rpc_tomar_notificaciones_pendientes({p_limite:20})`, envía por Resend y registra `rpc_resultado_notificacion({p_id,p_ok,p_error})`.

La migración limita a correos, incrementa intentos y mueve programada_at 5 minutos. SQL resultado: enviada si éxito; fallida al alcanzar max_reintentos_notificacion; si no, reprograma intentos×10 minutos. Una caída antes de guardar resultado permite reclamar otra vez; no hay idempotencia de proveedor implementada.

200: `{ok:true,procesadas,resultados:[{id,ok,result_saved,provider_id}]}`. `ok` exterior no implica todos los correos enviados. 401 no autorizado; 405 método; 500 fallo global. El identificador proveedor aparece en respuesta; no hay columna específica para persistirlo ni console.log explícito del ID en el worker, aunque README de implementación dice que queda en logs.
