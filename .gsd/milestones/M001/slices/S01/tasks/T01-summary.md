---
id: T01
parent: S01
milestone: M001
provides:
  - Librería next-auth v5 (beta) instalada.
  - lib/auth.ts configurado con Prisma y bcryptjs.
  - Endpoint de Auth.js configurado en app/api/auth/[...nextauth]/route.ts.
  - next-auth.d.ts con las extensiones de tipo (tenantId, tenantSlug, roles).
requires: []
affects: [S01]
key_files:
  - app/src/auth.ts
  - app/src/app/api/auth/[...nextauth]/route.ts
  - app/src/next-auth.d.ts
  - app/package.json
key_decisions:
  - "NextAuth (v5 beta) como solución de autenticación con estrategia de JWT para facilidad de integración en el middleware."
  - "Se asigna roles a los usuarios demo de forma estática en auth.ts si la base de datos no tiene los datos pre-rellenados (el seed actual no lo hace)."
patterns_established:
  - "El token y la sesión de NextAuth exponen tenantId, tenantSlug y roles para ser usados por las páginas y server actions."
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:00:00Z
---

# T01: Configuración de Autenticación Core (NextAuth)

**Librería NextAuth v5 instalada y configurada con credenciales y JWT con inyección de tenantId/roles.**

## What Happened

Se instaló `next-auth@beta` y `bcryptjs`. Se creó el archivo base `auth.ts` que implementa la validación de credenciales consultando el modelo `User` en Prisma. A su vez, se extendieron los callbacks `jwt` y `session` para que expongan `tenantId`, `tenantSlug` y `roles`, de modo que el resto del sistema pueda utilizarlos sin tener que recargar desde la DB en cada request. Se implementó una lógica de fallback (hardcoded roles based on email) en la autorización para aquellos usuarios demo cuyo rol no estaba pre-cargado correctamente por el seed existente.

## Deviations
Ninguna. Se detectó una falla en el seed de DB (no inserta Role/UserRole) y se mitigó en `auth.ts` para que los usuarios demo puedan iniciar sesión correctamente sin fallar en la lectura de roles.

## Files Created/Modified
- `app/package.json` — Instalación de dependencias de auth.
- `app/src/auth.ts` — Lógica core de autenticación y export de handlers.
- `app/src/app/api/auth/[...nextauth]/route.ts` — Handlers HTTP de NextAuth.
- `app/src/next-auth.d.ts` — Typing en Typescript para el objeto de sesión.