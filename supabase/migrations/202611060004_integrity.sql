begin;
create or replace function privado.rol_actual()
returns public.app_rol language sql stable security definer set search_path='' as $$
 select p.rol from public.perfiles p where p.id=auth.uid() and p.activo
 and (p.rol<>'responsable_area' or exists(select 1 from public.areas a where a.id=p.area_id and a.activa))
$$;
create or replace function privado.tg_contexto_anexo()
returns trigger language plpgsql security definer set search_path='' as $$
declare st text; rid uuid;
begin
 perform 1 from public.reclamos where id=new.reclamo_id for update;
 if new.origen='respuesta' then
  select estado,reclamo_id into st,rid from public.reclamo_respuestas where id=new.respuesta_id for update;
  if st is distinct from 'borrador' or rid is distinct from new.reclamo_id then raise exception 'La respuesta no admite documentos.' using errcode='P0001'; end if;
 end if;
 return new;
end $$;
drop trigger if exists trg_anexos_contexto on public.reclamo_anexos;
create trigger trg_anexos_contexto before insert on public.reclamo_anexos for each row execute function privado.tg_contexto_anexo();
create or replace function privado.tg_respuesta_documentos()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.estado in ('pendiente_aprobacion','aprobada') and new.estado is distinct from old.estado and exists(select 1 from public.reclamo_anexos where respuesta_id=new.id and not cargado) then
  raise exception 'Completa la carga de todos los documentos antes de enviar o aprobar.' using errcode='P0001';
 end if;
 return new;
end $$;
drop trigger if exists trg_respuesta_documentos on public.reclamo_respuestas;
create trigger trg_respuesta_documentos before update on public.reclamo_respuestas for each row execute function privado.tg_respuesta_documentos();
create or replace function privado.tg_validar_area()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.codigo=privado.param_texto('area_mesa_partes','MESA_PARTES') and (not new.activa or new.codigo is distinct from old.codigo) then raise exception 'El área de recepción debe permanecer activa con su código.' using errcode='22023'; end if;
 if new.responsable_id is not null and not exists(select 1 from public.perfiles where id=new.responsable_id and activo and rol='responsable_area' and area_id=new.id) then raise exception 'El responsable debe ser un perfil activo de la misma área.' using errcode='22023'; end if;
 return new;
end $$;
drop trigger if exists trg_validar_area on public.areas;
create trigger trg_validar_area before insert or update on public.areas for each row execute function privado.tg_validar_area();
create or replace function public.rpc_guardar_borrador_respuesta(
  p_reclamo_id uuid, p_asunto text, p_contenido text, p_conclusion text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rec public.reclamos;
  v_id  uuid;
begin
  if not privado.es_rol('responsable_area') then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into v_rec from public.reclamos where id = p_reclamo_id for update;
  if not found or v_rec.area_id is distinct from privado.area_actual() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  if v_rec.estado_codigo not in ('en_atencion', 'en_elaboracion_respuesta') then
    raise exception 'Solo se puede redactar la respuesta mientras el reclamo está en atención o en elaboración.' using errcode = 'P0001';
  end if;
  perform set_config('app.accion', 'guardar_borrador_respuesta', true);
  insert into public.reclamo_respuestas (reclamo_id, asunto, contenido, conclusion, redactada_por)
  values (p_reclamo_id, p_asunto, p_contenido, p_conclusion, auth.uid())
  on conflict (reclamo_id) do update
     set asunto = excluded.asunto, contenido = excluded.contenido, conclusion = excluded.conclusion,
         redactada_por = excluded.redactada_por
   where public.reclamo_respuestas.estado = 'borrador'
  returning id into v_id;
  if v_id is null then raise exception 'La respuesta ya fue enviada a aprobación.' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'respuesta_id', v_id);
end $$;


create or replace function privado.tg_sincronizar_responsable()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.activo or new.rol<>'responsable_area' or new.area_id is distinct from old.area_id then
  update public.areas set responsable_id=null where responsable_id=new.id and (id is distinct from new.area_id or not new.activo or new.rol<>'responsable_area');
 end if;
 return new;
end $$;
drop trigger if exists trg_sincronizar_responsable on public.perfiles;
create trigger trg_sincronizar_responsable after update of rol,area_id,activo on public.perfiles for each row execute function privado.tg_sincronizar_responsable();
commit;
