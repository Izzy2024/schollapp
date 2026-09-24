---
id: T01
parent: S01
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/auth.ts", "app/src/actions/authActions.ts", "app/src/auth.config.ts", "app/src/app/login/page.tsx"]
key_decisions: ["Definir como seed mínimo obligatorio: Tenant + User + UserMembership activos; roles DB quedan como recomendados pero se seedearán igual para estabilidad.", "El lugar natural para detectar 'seed missing' es en authenticate()/resolveLoginRedirectPath y/o en authorize() con una comprobación específica antes de lanzar error genérico."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Inspección directa de:
- app/src/actions/authActions.ts
- app/src/auth.ts
- app/src/auth.config.ts"
completed_at: 2026-03-27T19:56:28.477Z
blocker_discovered: false
---

# T01: Inventarié el flujo de auth y confirmé las dependencias mínimas de DB para login y resolución de rol.

> Inventarié el flujo de auth y confirmé las dependencias mínimas de DB para login y resolución de rol.

## What Happened
---
id: T01
parent: S01
milestone: M007
key_files:
  - app/src/auth.ts
  - app/src/actions/authActions.ts
  - app/src/auth.config.ts
  - app/src/app/login/page.tsx
key_decisions:
  - Definir como seed mínimo obligatorio: Tenant + User + UserMembership activos; roles DB quedan como recomendados pero se seedearán igual para estabilidad.
  - El lugar natural para detectar 'seed missing' es en authenticate()/resolveLoginRedirectPath y/o en authorize() con una comprobación específica antes de lanzar error genérico.
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:56:28.477Z
blocker_discovered: false
---

# T01: Inventarié el flujo de auth y confirmé las dependencias mínimas de DB para login y resolución de rol.

**Inventarié el flujo de auth y confirmé las dependencias mínimas de DB para login y resolución de rol.**

## What Happened

Se revisó el flujo de login: UI (`/login`) usa server action `authenticate()` que primero resuelve el redirect por rol consultando Prisma (`resolveLoginRedirectPath`), luego ejecuta `signIn('credentials')` (NextAuth). En `authorize()` (src/auth.ts) se consulta `User` por email e incluye `memberships` (con `tenant`) y `roles` (UserRole→Role). Si el usuario no existe o está inactivo, lanza Error('Usuario no encontrado o inactivo'). Si no hay membership, lanza Error('El usuario no pertenece a ninguna escuela'). Si no hay roles en DB para ese tenant, existe fallback por email (admin/director/docente/alumno/padre) para poblar `roles` en el token.

Conclusión: el login no depende estrictamente de Role/UserRole sembrados (hay fallback), pero S02 necesita interceptar el caso donde la DB está “vacía” (no hay usuario) y evitar que el error se envuelva como CallbackRouteError. Para seed mínimo, lo estrictamente requerido es: Tenant + User + UserMembership (activo). Roles en DB son recomendables para no depender del fallback.

## Verification

Inspección directa de:
- app/src/actions/authActions.ts
- app/src/auth.ts
- app/src/auth.config.ts

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `repo inspection (read files)` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

El error actual se loggea como `console.error('Login error:', error)` y, cuando llega como AuthError no-credentials, termina en mensaje genérico. Esto se resuelve en S02 con manejo específico (SEED_REQUIRED) y mensaje accionable.

## Files Created/Modified

- `app/src/auth.ts`
- `app/src/actions/authActions.ts`
- `app/src/auth.config.ts`
- `app/src/app/login/page.tsx`


## Deviations
Ninguna.

## Known Issues
El error actual se loggea como `console.error('Login error:', error)` y, cuando llega como AuthError no-credentials, termina en mensaje genérico. Esto se resuelve en S02 con manejo específico (SEED_REQUIRED) y mensaje accionable.
