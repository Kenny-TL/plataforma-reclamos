# Preparación para despliegue

> Estado actualizado: las migraciones de seguridad y las cuatro Edge Functions ya están desplegadas. Las invitaciones de `crear-personal` usan Supabase Auth, independiente de Resend; su proveedor integrado tiene una cuota de correo baja. Ante `email rate limit exceeded`, espera a que se reponga la cuota o configura SMTP personalizado en **Authentication → SMTP**. La URL `/functions/v1/crear-personal` exige JWT de administrador y POST; `UNAUTHORIZED_NO_AUTH_HEADER` al abrirla directamente es esperado.

Documento de dependencias; **no es una orden de despliegue**. Fase 0 no desplegó frontend/Edge, no aplicó migraciones ni programó envíos. El entorno remoto completo sigue sin certificar.

## Variables por nombre

| Ámbito | Nombre | Uso/estado observado |
|---|---|---|
| Next, pública | NEXT_PUBLIC_SUPABASE_URL | Presente localmente; URL de proyecto |
| Next, pública | NEXT_PUBLIC_SUPABASE_ANON_KEY | Presente; clave publishable actual, pese al nombre histórico |
| Next, pública | NEXT_PUBLIC_TURNSTILE_SITE_KEY | Presente; carga widget |
| Runtime Edge | SUPABASE_URL | Cliente backend; valor remoto no inspeccionado |
| Runtime Edge, secreto | SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEYS.default | Helper admite ambas fuentes; nunca NEXT_PUBLIC |
| Edge, secreto | TURNSTILE_SECRET_KEY | Siteverify; valor remoto no inspeccionado |
| Edge | TURNSTILE_ALLOWED_HOSTNAMES | Allowlist obligatoria, separada por comas |
| Edge | CORS_ALLOWED_ORIGIN | Origen web exacto; fallback local de código es `*`, revisar antes de producción |
| Edge, secreto | RESEND_API_KEY | Envío de cola; configuración/entrega no verificadas |
| Edge | RESEND_FROM_EMAIL | Remitente; dominio verificado sin comprobar |
| Vault | project_url, supabase_service_role_key | Nombres referidos por SQL 17; existencia no verificada |

No escribir valores secretos en documentación, SQL versionado, logs ni navegador. `.env*` está ignorado. No cambiar claves para completar pruebas de lectura.

## Dependencias a confirmar

- **Base existente:** comparar esquema, funciones, triggers, grants/RLS y migración aplicada. No volver a ejecutar 01–15, reset 99 ni `db push`. Validar catálogo, feriados y plazos institucionales antes de publicarlos como definitivos.
- **Auth:** deshabilitar registro público en el proveedor; comprobar Site URL, redirect allowlist y SMTP. Invitaciones Auth usan su propio proveedor, no automáticamente Resend del worker. Implementar aceptación/contraseña y recuperación solo conforme a configuración real.
- **Storage:** bucket anexos-reclamos privado, 5 MiB y PDF/JPEG/PNG, políticas efectivas y protección de origen/metadata. Resolver H02/H03 antes de módulo de respuestas.
- **Turnstile:** hostnames exactos de producción y localhost solo para desarrollo; action portal-ciudadano. Probar tokens válidos/incorrectos y renovación de un uso.
- **Edge:** confirmar versiones desplegadas y verify_jwt: false para portal/anexos/worker; true para crear-personal según archivo local. Las funciones públicas aplican sus propias comprobaciones; worker nunca accesible con clave pública.
- **Correo:** verificar Resend, remitente y dominio antes de habilitar envíos. Resolver idempotencia/lotes/lease/timeout. SMS permanece apagado.
- **Jobs:** revisar pg_cron, pg_net y Vault. SQL 14 propone alertas a las 07:00 Lima y limpieza semanal; SQL 17 propone worker cada 3 min con timeout 15 s. No se comprobó qué jobs existen ni se programó ninguno.

## Ruta de publicación futura

Una vez autorizadas las fases: cerrar hallazgos, pruebas funcionales/seguridad, confirmar variables del entorno destino, compilar con npm y documentar versiones frontend/backend como una entrega compatible. El backend está fuera de este repositorio; acordar cómo versionarlo y entregarlo sin copiar secretos o cachés.

Revisar CSP/cabeceras, dominios y accesibilidad con las necesidades reales de Supabase y Turnstile. No se configuraron cabeceras de seguridad personalizadas en `next.config.ts`. No afirmar que build correcto significa configuración de producción verificada.

Para cambios backend, presentar SQL y riesgos y esperar autorización; para desplegar o programar correo, obtener la autorización correspondiente después de disponer de un resultado revisable. No alterar RLS, buckets o permisos para facilitar pruebas.
