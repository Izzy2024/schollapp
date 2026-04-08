---
id: T03
parent: S01
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/prisma/seed.ts"]
key_decisions: ["Introducir un set mínimo de Permission codes y Role names canónicos para usar como single source en menús/guards.", "Mantener seed idempotente con upsert en Permission/Role/RolePermission/UserRole."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `cd app && node --import tsx scripts/seed.mjs` (seed completo)
- `cd app && node scripts/seed-check.mjs` (invariantes base)
- Query ad-hoc a Prisma para confirmar roles/userRoles/rolePermissions"
completed_at: 2026-03-27T19:58:23.406Z
blocker_discovered: false
---

# T03: Añadí RBAC mínimo al seed: permissions/roles/userRoles para que auth y menús por rol dependan de DB y no de heurísticas por email.

> Añadí RBAC mínimo al seed: permissions/roles/userRoles para que auth y menús por rol dependan de DB y no de heurísticas por email.

## What Happened
---
id: T03
parent: S01
milestone: M007
key_files:
  - app/prisma/seed.ts
key_decisions:
  - Introducir un set mínimo de Permission codes y Role names canónicos para usar como single source en menús/guards.
  - Mantener seed idempotente con upsert en Permission/Role/RolePermission/UserRole.
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:58:23.407Z
blocker_discovered: false
---

# T03: Añadí RBAC mínimo al seed: permissions/roles/userRoles para que auth y menús por rol dependan de DB y no de heurísticas por email.

**Añadí RBAC mínimo al seed: permissions/roles/userRoles para que auth y menús por rol dependan de DB y no de heurísticas por email.**

## What Happened

El seed ya creaba tenant + usuarios + memberships, pero no creaba roles/permissions ni enlaces UserRole, por lo que la app dependía del fallback por email en `authorize()`/`resolveLoginRedirectPath`. Se extendió `prisma/seed.ts` para:
- upsert de Permissions base (`app:admin`, `app:director`, `app:teacher`, `app:parent`, `app:student`)
- upsert de Roles por tenant (`admin`, `director`, `teacher`, `parent`, `student`)
- enlaces RolePermission
- enlaces UserRole por usuario demo (mapeando labels legacy `docente/alumno/padre` a roles canónicos)

Se verificó que seed sigue siendo idempotente y que ahora existen roles en DB + userRoles para el tenant demo.

## Verification

- `cd app && node --import tsx scripts/seed.mjs` (seed completo)
- `cd app && node scripts/seed-check.mjs` (invariantes base)
- Query ad-hoc a Prisma para confirmar roles/userRoles/rolePermissions

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs` | 0 | ✅ pass | 120000ms |
| 2 | `prisma ad-hoc query (roles/userRoles counts)` | 0 | ✅ pass | 120000ms |


## Deviations

Ninguna.

## Known Issues

Los nombres de rol en usersData aún usan labels legacy (`docente`, `alumno`, `padre`) pero ya se traducen a roles canónicos en DB. En S03 se puede consolidar este naming si conviene.

## Files Created/Modified

- `app/prisma/seed.ts`


## Deviations
Ninguna.

## Known Issues
Los nombres de rol en usersData aún usan labels legacy (`docente`, `alumno`, `padre`) pero ya se traducen a roles canónicos en DB. En S03 se puede consolidar este naming si conviene.
