# Roles y permisos

Fuente: SQL locales 01, 05, 06, 10–13. Vigencia remota pendiente. No se crearon roles ni permisos durante Fase 0.

## Modelo existente

`public.app_rol` tiene cuatro valores: `mesa_partes`, `responsable_area`, `supervisor`, `administrador`. El ciudadano no tiene cuenta. `ciudadano` y `sistema` en transiciones son actores, no nuevos roles Auth. No existen tablas de roles/permisos granulares ni un rol adicional de personal de atención.

`privado.rol_actual()` y `area_actual()` solo consideran perfiles activos y usan `auth.uid()`. Las RPC comprueban rol/área/transición; RLS filtra lectura. Los permisos propuestos como `reclamos.ver_todos` no son códigos implementados y no deben usarse como si existieran.

| Operación | Mesa de partes | Responsable de área | Supervisor | Administrador |
|---|---|---|---|---|
| Leer reclamos | Todos | Solo área propia | Todos | Sin lectura directa |
| Leer reclamante | Sí | No; nombre reservado | Sí | Sin lectura directa |
| DNI en bandeja | Enmascarado | Enmascarado | Enmascarado | Sin bandeja |
| Revisar/clasificar/observar/derivar | Según transición | No | No, salvo acciones expresas | No |
| No admitir/otra entidad | En revisión | No | En revisión | No |
| Solicitar reasignación | No | Derivado/en atención, área propia | No | No |
| Resolver reasignación | Sí | No | Sí | No |
| Actuación interna | No | Área propia | Sí | No |
| Redactar/subir respuesta | No | Área propia y condiciones RPC | No | No |
| Aprobar/devolver/cerrar/archivar | No | No | Según estado y requisitos | No |
| Consultar respuesta interna | No por RLS de respuestas | Área propia | Sí | No por RLS de respuestas |
| Notificaciones ciudadanas y canal alterno | Sí | No, salvo avisos propios | Sí | No |
| Indicadores/exportación RPC | No | No | Sí | Sí |
| Consultar perfiles | Propio | Propio | Todos | Todos |
| Invitar/editar/activar perfiles | No | No | No | Sí |
| Leer catálogos | Sí, activo | Sí, activo | Sí, activo | Sí, activo |
| Editar catálogos/parámetros | No | No | No | Sí |
| Leer auditoría | No | No | Sí | Sí: riesgo H01 |

La exportación del administrador devuelve filas identificadas por código sin DNI/contactos: es una excepción expresa en SQL a su falta de acceso directo a expedientes. No es exclusivamente un agregado. La auditoría puede exponer contenido individual adicional: no confundir intención documentada con aislamiento efectivo.

## Perfiles y acceso actual

El trigger de Auth crea perfil `mesa_partes`, inactivo, sin área. La Edge `crear-personal` verifica JWT ante Auth y exige administrador activo. Solo admite email/nombres/apellidos; no asigna roles ni activa perfiles. Invitación usa SMTP de Supabase Auth, independiente del worker Resend.

La política `perfiles_admin_update` permite UPDATE al administrador y no concede UPDATE a otros roles. No existe RPC dedicada para ese cambio ni prohibición explícita de autoeditarse o desactivar al último administrador. No hay DELETE concedido sobre perfiles. `perfiles.id` referencia `auth.users` con cascade; no implementar borrado de personal histórico sin revisar todas sus referencias.

`responsable_area` activo requiere `area_id` por CHECK. El guard Next comprueba área existente; no consulta su bandera `activa`. Asignación del expediente es `reclamos.area_id`; `areas.responsable_id` no equivale a asignación individual por reclamo.

## Reglas para fases siguientes

Usar las acciones devueltas por `rpc_detalle_reclamo`, comprobando también autorización backend. No hacer UPDATE directo de reclamos/historial. No dar a administrador poderes operativos por su etiqueta ni crear roles duplicados. Las rutas futuras deben verificar perfil en servidor además del Proxy.

Probar por separado usuario sin perfil, inactivo, rol inválido, área ajena, manipulación de UUID/payload y revocación de permisos durante sesión. Esta auditoría no autenticó cuentas de personal ni certificó esas políticas en remoto.
