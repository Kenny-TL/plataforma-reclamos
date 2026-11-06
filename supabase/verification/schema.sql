select jsonb_build_object(
  'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns where table_schema='public'),
  'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rpc_%'),
  'roles', (select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='app_rol'),
  'states', (select jsonb_agg(to_jsonb(e) order by e.orden) from public.estados_reclamo e),
  'policies', (select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'using',qual,'check',with_check)) from pg_policies where schemaname in ('public','storage')),
  'rls', (select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'bucket', (select jsonb_agg(jsonb_build_object('id',id,'public',public,'limit',file_size_limit,'mime',allowed_mime_types)) from storage.buckets where id='anexos-reclamos'),
  'staff_counts', (select jsonb_agg(to_jsonb(s)) from (select rol,activo,count(*) as total from public.perfiles group by rol,activo) s),
  'extensions', (select jsonb_agg(extname) from pg_extension),
  'citizen_grants', (select jsonb_agg(jsonb_build_object('name',p.proname,'anon',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rpc_registrar_reclamo','rpc_consultar_reclamo','rpc_presentar_subsanacion','rpc_ruta_anexo_respuesta'))
) as schema_audit;
