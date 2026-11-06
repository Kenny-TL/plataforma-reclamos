begin;
create or replace function public.rpc_indicadores_v2(
  p_desde date default null, p_hasta date default null, p_area_id integer default null, p_categoria_id integer default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_res jsonb;
  v_ant integer := privado.param_int('alerta_preventiva_dias', 3);
begin
  if not privado.es_rol('supervisor', 'administrador') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  v_res := (
    with base as (
      select r.*, e.nombre as estado_nombre, e.orden as estado_orden,
             case when e.plazo_activo and not e.suspende_plazo
                  then privado.dias_restantes(r.fecha_vencimiento) end as dias_rest
      from public.reclamos r
      join public.estados_reclamo e on e.codigo = r.estado_codigo
      where (p_desde is null or (r.fecha_registro at time zone 'America/Lima')::date >= p_desde)
        and (p_hasta is null or (r.fecha_registro at time zone 'America/Lima')::date <= p_hasta)
        and (p_area_id is null or r.area_id = p_area_id)
        and (p_categoria_id is null or r.categoria_id = p_categoria_id)
    )
    select jsonb_build_object(
      'kpis', jsonb_build_object(
        'total',             (select count(*) from base),
        'nuevos',            (select count(*) from base where estado_codigo = 'registrado'),
        'en_atencion',       (select count(*) from base where estado_codigo = 'en_atencion'),
        'observados',        (select count(*) from base where estado_codigo in ('observado','pendiente_subsanacion')),
        'proximos_a_vencer', (select count(*) from base where dias_rest between 0 and v_ant),
        'vencidos',          (select count(*) from base where dias_rest < 0),
        'respondidos',       (select count(*) from base where estado_codigo = 'respondido'),
        'cerrados',          (select count(*) from base where estado_codigo = 'cerrado'),
        'tiempo_promedio_dias', (select round(avg(privado.dias_habiles_entre(
                                    (fecha_registro at time zone 'America/Lima')::date,
                                    (fecha_respuesta at time zone 'America/Lima')::date)), 1)
                                 from base where fecha_respuesta is not null),
        'pct_dentro_plazo',  (select round(100.0 * count(*) filter (
                                    where (fecha_respuesta at time zone 'America/Lima')::date <= fecha_vencimiento)
                                    / nullif(count(*), 0), 1)
                              from base where fecha_respuesta is not null)),
      'por_categoria', (select coalesce(jsonb_agg(jsonb_build_object('categoria', c.nombre, 'total', coalesce(n.total, 0))
                          order by c.nombre), '[]'::jsonb)
                        from public.categorias c
                        left join (select categoria_id, count(*) total from base group by 1) n on n.categoria_id = c.id
                        where c.activa or n.total > 0),
      'por_estado', (select coalesce(jsonb_agg(jsonb_build_object('estado', s.estado_nombre, 'total', s.total)
                       order by s.estado_orden), '[]'::jsonb)
                     from (select estado_nombre, estado_orden, count(*) total from base group by 1, 2) s),
      'por_area', (select coalesce(jsonb_agg(jsonb_build_object('area', a.nombre, 'total', coalesce(n.total, 0))
                     order by a.nombre), '[]'::jsonb)
                   from public.areas a
                   left join (select area_id, count(*) total from base group by 1) n on n.area_id = a.id
                   where a.activa or n.total > 0),
      'evolucion', (select coalesce(jsonb_agg(jsonb_build_object('periodo', s.periodo, 'total', s.total)
                      order by s.periodo), '[]'::jsonb)
                    from (select to_char((fecha_registro at time zone 'America/Lima'), 'YYYY-MM') periodo, count(*) total
                          from base group by 1) s)
    )
  );
  v_res := v_res || jsonb_build_object('tiempos_por_area', (
    select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
      select a.nombre as area, count(*) as respondidos,
             round(avg(privado.dias_habiles_entre((r.fecha_registro at time zone 'America/Lima')::date,(r.fecha_respuesta at time zone 'America/Lima')::date)),1) as promedio
      from public.reclamos r join public.areas a on a.id=r.area_id
      where r.fecha_respuesta is not null
        and (p_desde is null or (r.fecha_registro at time zone 'America/Lima')::date>=p_desde)
        and (p_hasta is null or (r.fecha_registro at time zone 'America/Lima')::date<=p_hasta)
        and (p_area_id is null or r.area_id=p_area_id)
        and (p_categoria_id is null or r.categoria_id=p_categoria_id)
      group by a.nombre order by a.nombre
    ) s));
  return v_res;
end $$;

-- Exportación (sin datos personales) ---------------------------------------------
create or replace function public.rpc_exportar_reclamos_v2(
  p_desde date default null, p_hasta date default null, p_area_id integer default null, p_categoria_id integer default null, p_limite integer default 500, p_desplazamiento integer default 0
) returns table (
  codigo text, fecha_registro date, categoria text, subcategoria text, area text,
  estado text, fecha_vencimiento date, dias_restantes integer,
  fecha_respuesta date, fecha_cierre date
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_rol('supervisor', 'administrador') then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  return query
  select r.codigo, (r.fecha_registro at time zone 'America/Lima')::date, c.nombre, r.subcategoria, a.nombre,
         e.nombre, r.fecha_vencimiento,
         case when e.plazo_activo and not e.suspende_plazo then privado.dias_restantes(r.fecha_vencimiento) end,
         (r.fecha_respuesta at time zone 'America/Lima')::date, (r.fecha_cierre at time zone 'America/Lima')::date
  from public.reclamos r
  join public.categorias c on c.id = r.categoria_id
  join public.areas a on a.id = r.area_id
  join public.estados_reclamo e on e.codigo = r.estado_codigo
  where (p_desde is null or (r.fecha_registro at time zone 'America/Lima')::date >= p_desde)
    and (p_hasta is null or (r.fecha_registro at time zone 'America/Lima')::date <= p_hasta)
    and (p_area_id is null or r.area_id = p_area_id)
        and (p_categoria_id is null or r.categoria_id = p_categoria_id)
  order by r.fecha_registro desc, r.id
  limit greatest(least(p_limite,500),1) offset greatest(p_desplazamiento,0);
end $$;

revoke all on function public.rpc_indicadores_v2(date,date,integer,integer), public.rpc_exportar_reclamos_v2(date,date,integer,integer,integer,integer) from public,anon;
grant execute on function public.rpc_indicadores_v2(date,date,integer,integer), public.rpc_exportar_reclamos_v2(date,date,integer,integer,integer,integer) to authenticated;
commit;
