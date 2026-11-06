-- Correcciones H01/H02/H07. No recrea tablas, roles ni estados existentes.
-- Impacto: los perfiles se editan por RPC; documentos de respuesta solo por Edge;
-- administrador lee auditoría de configuración/personal, sin expedientes individuales.
begin;

drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria for select to authenticated using (
  privado.es_rol('supervisor') or (privado.es_rol('administrador') and tabla in
  ('perfiles','areas','categorias','reglas_derivacion','parametros','plantillas','feriados'))
);
create or replace view public.v_auditoria_resumen with (security_invoker=true) as
select id,tabla,registro_id,operacion,accion,usuario_id,rol,created_at from public.auditoria;
grant select on public.v_auditoria_resumen to authenticated;

create or replace function privado.tg_proteger_personal()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'La identidad y correo del personal se gestionan mediante Auth.' using errcode='42501';
  end if;
  if auth.uid()=old.id and (new.rol is distinct from old.rol or new.area_id is distinct from old.area_id or new.activo is distinct from old.activo) then
    raise exception 'No puedes modificar tus propios permisos o estado.' using errcode='42501';
  end if;
  if new.activo and new.rol='responsable_area' and not exists(select 1 from public.areas where id=new.area_id and activa) then
    raise exception 'Asigna un área activa al responsable.' using errcode='22023';
  end if;
  if old.activo and old.rol='administrador' and (not new.activo or new.rol<>'administrador') then
    perform pg_advisory_xact_lock(70061001);
    if (select count(*) from public.perfiles where activo and rol='administrador')<2 then
      raise exception 'No se puede desactivar al último administrador.' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_personal on public.perfiles;
create trigger trg_proteger_personal before update on public.perfiles for each row execute function privado.tg_proteger_personal();
revoke update on public.perfiles from authenticated;

create or replace function public.rpc_actualizar_personal(p_id uuid,p_nombres text,p_apellidos text,p_rol public.app_rol,p_area_id integer,p_activo boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not privado.es_rol('administrador') then raise exception 'No autorizado.' using errcode='42501'; end if;
  if btrim(coalesce(p_nombres,''))='' or btrim(coalesce(p_apellidos,''))='' or p_rol is null or p_activo is null then raise exception 'Completa los datos obligatorios.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(70061001);
  perform set_config('app.accion','actualizar_personal',true);
  update public.perfiles set nombres=btrim(p_nombres),apellidos=btrim(p_apellidos),rol=p_rol,area_id=p_area_id,activo=p_activo where id=p_id;
  if not found then raise exception 'Perfil no encontrado.' using errcode='P0002'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.rpc_actualizar_personal(uuid,text,text,public.app_rol,integer,boolean) from public,anon;
grant execute on function public.rpc_actualizar_personal(uuid,text,text,public.app_rol,integer,boolean) to authenticated;

-- La Edge verifica JWT, rol, área, metadata, borrador y firma binaria.
drop policy if exists anexos_responsable_insert on storage.objects;
create or replace function public.rpc_confirmar_anexo_respuesta(p_anexo_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_x public.reclamo_anexos; v_metadata jsonb;
begin
  select * into v_x from public.reclamo_anexos where id=p_anexo_id and origen='respuesta' for update;
  if not found or not(privado.es_rol('responsable_area') and privado.puede_ver_reclamo(v_x.reclamo_id)) then raise exception 'No autorizado.' using errcode='42501'; end if;
  perform 1 from public.reclamos where id=v_x.reclamo_id and estado_codigo in ('en_atencion','en_elaboracion_respuesta') for update;
  if not found or not exists(select 1 from public.reclamo_respuestas where id=v_x.respuesta_id and estado='borrador') then raise exception 'La respuesta ya no admite documentos.' using errcode='P0001'; end if;
  select metadata into v_metadata from storage.objects where bucket_id='anexos-reclamos' and name=v_x.storage_path;
  if v_metadata is null then raise exception 'El archivo no está almacenado.' using errcode='P0001'; end if;
  if (v_metadata->>'size')::bigint is distinct from v_x.tamano_bytes or lower(v_metadata->>'mimetype') is distinct from lower(v_x.mime_type) then raise exception 'El archivo no coincide con sus metadatos.' using errcode='22023'; end if;
  update public.reclamo_anexos set cargado=true where id=p_anexo_id;
  return jsonb_build_object('ok',true);
end $$;

create or replace function privado.tg_validar_parametro()
returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if new.clave='sms_habilitado' and new.valor<>'false'::jsonb then raise exception 'SMS no está habilitado en esta plataforma.' using errcode='22023'; end if;
  if new.clave='anexos_formatos' and new.valor<>'["pdf","jpg","jpeg","png"]'::jsonb then raise exception 'Los formatos deben coincidir con Storage y la validación de archivos.' using errcode='22023'; end if;
  if new.clave in ('max_anexos','max_anexo_bytes','descripcion_min','descripcion_max','plazo_atencion_dias_habiles','plazo_subsanacion_dias_habiles','alerta_preventiva_dias','max_reintentos_notificacion','max_intentos_consulta','max_intentos_consulta_ip','ventana_bloqueo_min','max_registros_hora_ip') then
    if jsonb_typeof(new.valor)<>'number' or new.valor::text !~ '^\d+$' then raise exception 'El parámetro requiere un entero positivo.' using errcode='22023'; end if;
    n:=(new.valor::text)::integer;
    if n<1 or n>10000000 then raise exception 'Parámetro fuera del intervalo permitido.' using errcode='22023'; end if;
    if (new.clave='max_anexo_bytes' and n>5242880) or (new.clave='max_anexos' and n>5) or (new.clave='descripcion_min' and n<30) or (new.clave='descripcion_max' and n>2000) then raise exception 'El límite supera las restricciones del almacenamiento o expediente.' using errcode='22023'; end if;
    if new.clave='descripcion_min' and n>privado.param_int('descripcion_max',2000) or new.clave='descripcion_max' and n<privado.param_int('descripcion_min',30) then raise exception 'Límites de descripción inconsistentes.' using errcode='22023'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_validar_parametro on public.parametros;
create trigger trg_validar_parametro before insert or update on public.parametros for each row execute function privado.tg_validar_parametro();

alter table public.notificaciones add column if not exists provider_id text;
create or replace function public.rpc_confirmar_envio_notificacion(p_id uuid,p_provider_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if btrim(coalesce(p_provider_id,''))='' then raise exception 'Falta confirmación del proveedor.' using errcode='22023'; end if;
  update public.notificaciones set provider_id=p_provider_id where id=p_id and canal='correo';
  if not found then raise exception 'Notificación no encontrada.' using errcode='P0002'; end if;
  perform public.rpc_resultado_notificacion(p_id,true,null);
end $$;
revoke all on function public.rpc_confirmar_envio_notificacion(uuid,text) from public,anon,authenticated;
grant execute on function public.rpc_confirmar_envio_notificacion(uuid,text) to service_role;
commit;
