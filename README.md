# Plataforma Digital Inteligente de Gestión de Reclamos Ciudadanos

Municipalidad Distrital de Pillco Marca, Huánuco, Perú. Investigación 2026.

## Estado al 06/11/2026

Implementación integral completada. El portal ciudadano y el panel municipal están operativos, con migraciones de seguridad aplicadas en Supabase, cuatro Edge Functions desplegadas y pruebas de flujo con rollback. Consulta el [informe de cierre de fases](PHASE_REPORTS.md) y la [auditoría inicial](AUDIT_PHASE_0.md).

## Documentación del proyecto

| Documento | Contenido |
|---|---|
| [AUDIT_PHASE_0.md](AUDIT_PHASE_0.md) | Hallazgos, evidencia, decisiones y plan por fases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura actual y propuesta |
| [MODULES.md](MODULES.md) | Estado y dependencias de módulos |
| [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md) | Cuatro roles y permisos reales |
| [DATABASE.md](DATABASE.md) | Tablas, estados, migración y cálculos |
| [API_CONTRACTS.md](API_CONTRACTS.md) | Edge Functions y RPC |
| [SECURITY.md](SECURITY.md) | Controles, riesgos y verificaciones pendientes |
| [TESTING.md](TESTING.md) | Pruebas ejecutadas y pendientes |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Variables y preparación de despliegue |
| [CHANGELOG.md](CHANGELOG.md) | Cambios de esta etapa |
| [PHASE_REPORTS.md](PHASE_REPORTS.md) | Resultado y evidencias del cierre de fases |

## Configuración local

Instalado: Next.js 16.4.5, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.4, Supabase JS 2.119.0 y SSR 0.12.7. Gestor: npm.

Configurar en `.env.local` los nombres siguientes con valores públicos del proyecto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

El nombre `ANON_KEY` contiene actualmente una clave publishable; nunca colocar una clave de servicio. Rutas actuales: `/`, `/login`, `/admin`. Fechas institucionales: DD/MM/AAAA y America/Lima. El límite de fecha del formulario usa UTC: desviación documentada, aún sin corregir.

El backend versionado está en `supabase/`. Las migraciones nuevas se aplicaron al proyecto enlazado y las funciones se desplegaron mediante el CLI de Supabase. El correo automático queda pendiente hasta configurar Resend; no se activó ningún scheduler.

## Comandos

Con las dependencias instaladas:

```sh
npm run dev
npm run lint
npx --no-install tsc --noEmit --incremental false
npm run build
npm run start
```

Desarrollo: <http://localhost:3000>. Página principal: `src/app/page.tsx`. Antes de escribir código Next.js, leer las guías de la versión instalada indicadas en AGENTS.md. Para preparación de publicación consultar [DEPLOYMENT.md](DEPLOYMENT.md); esta auditoría no autorizó un despliegue.
