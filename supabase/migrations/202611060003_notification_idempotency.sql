begin;
alter table public.notificaciones add column if not exists provider_started_at timestamptz;
create or replace function public.rpc_iniciar_envio_notificacion(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare n public.notificaciones;
begin
  select * into n from public.notificaciones where id=p_id for update;
  if not found or n.estado<>'pendiente' or n.canal<>'correo' then return false; end if;
  if n.provider_id is null and n.provider_started_at < now()-interval '23 hours' then
    raise exception 'Envío incierto fuera de la ventana de idempotencia. Verificar en el proveedor o registrar un canal alterno.' using errcode='P0001';
  end if;
  update public.notificaciones set provider_started_at=coalesce(provider_started_at,now()) where id=p_id;
  return true;
end $$;
revoke all on function public.rpc_iniciar_envio_notificacion(uuid) from public,anon,authenticated;
grant execute on function public.rpc_iniciar_envio_notificacion(uuid) to service_role;
commit;
