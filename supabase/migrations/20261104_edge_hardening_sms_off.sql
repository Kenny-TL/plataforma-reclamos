-- Ejecutar DESPUÉS de los scripts 01-14.
-- El portal público solo podrá ejecutar las operaciones ciudadanas a través de Edge Functions.

begin;

revoke execute on function public.rpc_registrar_reclamo(jsonb),
  public.rpc_consultar_reclamo(text, text),
  public.rpc_presentar_subsanacion(text, text, text, jsonb),
  public.rpc_ruta_anexo_respuesta(text, text, uuid)
from public, anon, authenticated;

grant execute on function public.rpc_registrar_reclamo(jsonb),
  public.rpc_consultar_reclamo(text, text),
  public.rpc_presentar_subsanacion(text, text, text, jsonb),
  public.rpc_ruta_anexo_respuesta(text, text, uuid)
to service_role;

-- SMS no se utilizará en esta versión.
update public.parametros set valor = 'false'::jsonb where clave = 'sms_habilitado';

-- Cancelar cualquier SMS pendiente de pruebas/desarrollo, para que no quede retenido en la cola.
update public.notificaciones
set estado = 'cancelada', ultimo_error = 'SMS deshabilitado: el proyecto utiliza únicamente correo electrónico.'
where canal = 'sms' and estado = 'pendiente';

-- La cola solo reclama correos. Así no se consumen intentos de notificaciones SMS.
create or replace function public.rpc_tomar_notificaciones_pendientes(p_limite integer default 20)
returns setof public.notificaciones
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with t as (
    select n.id from public.notificaciones n
    where n.estado = 'pendiente' and n.programada_at <= now() and n.canal = 'correo'
    order by n.programada_at
    limit greatest(least(p_limite, 50), 1)
    for update skip locked
  )
  update public.notificaciones n
     set intentos = n.intentos + 1, programada_at = now() + interval '5 minutes'
    from t where n.id = t.id
  returning n.*;
end $$;

revoke execute on function public.rpc_tomar_notificaciones_pendientes(integer),
  public.rpc_resultado_notificacion(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.rpc_tomar_notificaciones_pendientes(integer),
  public.rpc_resultado_notificacion(uuid, boolean, text) to service_role;

commit;
