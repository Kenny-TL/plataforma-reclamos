-- Pruebas de integración aisladas. TODAS las filas de prueba terminan en ROLLBACK.
-- No envía correo, no crea usuarios persistentes ni objetos binarios.
-- Las secuencias PostgreSQL pueden conservar huecos de numeración técnica.
begin;
create temp table test_context(key text primary key,value jsonb);
grant select,insert,update on test_context to authenticated,anon,service_role;
insert into test_context select r,to_jsonb(gen_random_uuid()::text) from unnest(array['mesa_partes','responsable_area','supervisor','administrador','inactive']) r;
insert into auth.users(id,email,raw_user_meta_data)
select (value#>>'{}')::uuid,'rollback-'||key||'@example.invalid','{"nombres":"Prueba","apellidos":"Transaccional"}'::jsonb from test_context;
update public.perfiles p set rol=case when t.key='inactive' then 'mesa_partes'::public.app_rol else t.key::public.app_rol end,
  activo=t.key<>'inactive',area_id=case when t.key='responsable_area' then (select id from public.areas where activa and codigo<>'MESA_PARTES' order by id limit 1) end
from test_context t where p.id=(t.value#>>'{}')::uuid;
insert into test_context values
  ('area',to_jsonb((select id from public.areas where activa and codigo<>'MESA_PARTES' order by id limit 1))),
  ('category',to_jsonb((select id from public.categorias where activa order by id limit 1)));
create function pg_temp.test_id(k text) returns uuid language sql as $$select (value#>>'{}')::uuid from pg_temp.test_context where key=k$$;
create function pg_temp.test_number(k text) returns integer language sql as $$select (value#>>'{}')::integer from pg_temp.test_context where key=k$$;
create function pg_temp.test_actor(k text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.test_id(k),'role',case when k='anon' then 'anon' when k is null then 'service_role' else 'authenticated' end)::text,true);
  perform set_config('app.actor','',true); perform set_config('app.accion','',true); perform set_config('app.evento','',true); perform set_config('app.motivo','',true);
end $$;
do $$ declare ns text; begin
  select nspname into ns from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated,anon,service_role',ns);
  execute format('grant execute on all functions in schema %I to authenticated,anon,service_role',ns);
end $$;

set local role service_role;
select pg_temp.test_actor(null);
do $$
declare v jsonb; i integer;
begin
  for i in 1..2 loop
    v:=public.rpc_registrar_reclamo(jsonb_build_object(
      'ciudadano',jsonb_build_object('nombres','Prueba','apellido_paterno','Transaccional','apellido_materno','Rollback','numero_documento','00000000','domicilio','Entorno de prueba aislado','distrito','Pillco Marca','provincia','Huánuco'),
      'reclamo',jsonb_build_object('asunto','Validación transaccional sin persistencia','categoria_id',pg_temp.test_number('category'),'lugar','Entorno de prueba aislado','descripcion','Descripción de prueba de integración que se revierte al finalizar.','solucion','Validar el flujo sin conservar registros'),
      'acepta_declaracion',true,'anexos','[]'::jsonb));
    insert into pg_temp.test_context values('claim'||i,v->'id'),('code'||i,v->'codigo');
  end loop;
end $$;

set local role anon;
select pg_temp.test_actor('anon');
do $$ begin
  begin perform public.rpc_consultar_reclamo('00000000',(select value#>>'{}' from pg_temp.test_context where key='code1')); raise exception 'FAIL: RPC ciudadana directa abierta' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin perform id from public.reclamos limit 1; raise exception 'FAIL: anon lee tabla' using errcode='XX000'; exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select pg_temp.test_actor('inactive');
do $$ begin
  if exists(select 1 from public.v_bandeja_reclamos) then raise exception 'FAIL: inactivo lee bandeja'; end if;
  begin perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'revisar','Prueba','{}'); raise exception 'FAIL: inactivo ejecuta acción' using errcode='XX000'; exception when insufficient_privilege then null; end;
end $$;

select pg_temp.test_actor('mesa_partes');
do $$ declare v jsonb; begin
  if not exists(select 1 from public.v_bandeja_reclamos where id=pg_temp.test_id('claim1')) then raise exception 'FAIL: mesa no lee reclamo'; end if;
  begin update public.perfiles set rol='administrador' where id=pg_temp.test_id('mesa_partes'); raise exception 'FAIL: elevación por update' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin update public.reclamos set estado_codigo='cerrado' where id=pg_temp.test_id('claim1'); raise exception 'FAIL: escritura directa de expediente' using errcode='XX000'; exception when insufficient_privilege then null; end;
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'revisar','Revisión de integración','{}');
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'confirmar_categoria',null,jsonb_build_object('categoria_id',pg_temp.test_number('category')));
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'registrar_observacion',null,'{"texto":"Completa la información de prueba."}');
  v:=public.rpc_detalle_reclamo(pg_temp.test_id('claim1'));
  if v#>>'{resumen,estado_codigo}'<>'observado' then raise exception 'FAIL: no observa'; end if;
end $$;

set local role service_role;
select pg_temp.test_actor(null);
do $$ declare v jsonb; begin
  v:=public.rpc_presentar_subsanacion('00000000',(select value#>>'{}' from pg_temp.test_context where key='code1'),'Información corregida dentro de la prueba.','[]');
  if not (v->>'ok')::boolean then raise exception 'FAIL: subsanación rechazada'; end if;
end $$;

set local role authenticated;
select pg_temp.test_actor('mesa_partes');
select public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'derivar','Derivación de integración',jsonb_build_object('area_id',pg_temp.test_number('area')));
select pg_temp.test_actor('responsable_area');
do $$ declare v jsonb; begin
  if exists(select 1 from public.v_bandeja_reclamos where id=pg_temp.test_id('claim2')) then raise exception 'FAIL: acceso horizontal a otra área'; end if;
  if exists(select 1 from public.reclamantes where reclamo_id=pg_temp.test_id('claim1')) then raise exception 'FAIL: responsable ve reclamante'; end if;
  v:=public.rpc_detalle_reclamo(pg_temp.test_id('claim1'));
  if v->'reclamante'<>'null'::jsonb then raise exception 'FAIL: detalle filtra identidad'; end if;
  begin perform public.rpc_ejecutar_accion(pg_temp.test_id('claim2'),'revisar','Prueba','{}'); raise exception 'FAIL: acción horizontal' using errcode='XX000'; exception when insufficient_privilege then null; end;
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'iniciar_atencion','Inicio de atención','{}');
  perform public.rpc_registrar_actuacion(pg_temp.test_id('claim1'),'Avance interno de prueba transaccional.');
  perform public.rpc_guardar_borrador_respuesta(pg_temp.test_id('claim1'),'Respuesta de prueba','Contenido de integración sin persistencia.','Validación correcta.');
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'enviar_aprobacion','Borrador completo','{}');
end $$;

select pg_temp.test_actor('supervisor');
do $$ declare v jsonb; begin
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'aprobar_respuesta','Respuesta verificada','{}');
  begin perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'cerrar','Cierre anticipado','{}'); raise exception 'FAIL: cierra sin notificar' using errcode='XX000'; exception when sqlstate 'P0001' then null; end;
  perform public.rpc_registrar_notificacion_manual(pg_temp.test_id('claim1'),'presencial','Constancia de comunicación de prueba','respuesta');
  perform public.rpc_ejecutar_accion(pg_temp.test_id('claim1'),'cerrar','Cierre después de notificación','{}');
  v:=public.rpc_detalle_reclamo(pg_temp.test_id('claim1'));
  if v#>>'{resumen,estado_codigo}'<>'cerrado' then raise exception 'FAIL: cierre final'; end if;
end $$;

select pg_temp.test_actor('administrador');
do $$ declare v jsonb; begin
  if exists(select 1 from public.v_bandeja_reclamos) then raise exception 'FAIL: administrador lee expedientes'; end if;
  if exists(select 1 from public.auditoria where tabla in ('reclamos','reclamo_respuestas','reclamantes')) then raise exception 'FAIL: fuga por auditoría'; end if;
  v:=public.rpc_indicadores_v2(null,null,null,pg_temp.test_number('category'));
  if (v#>>'{kpis,total}')::integer<2 then raise exception 'FAIL: indicadores reales'; end if;
  if (select count(*) from public.rpc_exportar_reclamos_v2(null,null,null,null,1,0))<>1 then raise exception 'FAIL: exportación paginada'; end if;
  begin perform public.rpc_actualizar_personal(pg_temp.test_id('administrador'),'Prueba','Transaccional','supervisor',null,true); raise exception 'FAIL: autoedición de privilegios' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin update public.parametros set valor='true'::jsonb where clave='sms_habilitado'; raise exception 'FAIL: habilita SMS' using errcode='XX000'; exception when sqlstate '22023' then null; end;
end $$;

set local role service_role;
select pg_temp.test_actor(null);
do $$ begin
  begin update public.reclamo_historial set evento='Alteración' where reclamo_id=pg_temp.test_id('claim1'); raise exception 'FAIL: historial mutable' using errcode='XX000'; exception when insufficient_privilege then null; end;
  if exists(select 1 from public.notificaciones where reclamo_id in (pg_temp.test_id('claim1'),pg_temp.test_id('claim2')) and canal='sms') then raise exception 'FAIL: SMS generado'; end if;
end $$;
rollback;
