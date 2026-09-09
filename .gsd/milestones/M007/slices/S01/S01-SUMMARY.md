---
id: S01
parent: M007
milestone: M007
provides:
  - `prisma db seed` funcional y documentado
  - Dataset mínimo para login por rol
  - Roles/permisos/userRoles en DB para tenant demo
requires:
  []
affects:
  - S02
  - S03
key_files:
  - app/prisma/schema.prisma
  - app/package.json
  - app/prisma/seed.ts
  - app/README.md
key_decisions:
  - Usar `prisma db seed` como camino estándar conectado a `scripts/seed.mjs` (runner determinista).
  - Seedear RBAC mínimo en DB (roles/permisos/userRoles) para eliminar dependencia del fallback por email.
patterns_established:
  - Seed idempotente via upsert y runner TSX determinista.
  - Roles canónicos (`admin/director/teacher/parent/student`) como base para guards/menús.
observability_surfaces:
  - `scripts/seed-check.mjs` como chequeo rápido de invariantes de seed
  - Doc en `app/README.md` con pasos y credenciales demo
drill_down_paths:
  - .gsd/milestones/M007/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M007/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M007/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M007/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:01:23.906Z
blocker_discovered: false
---

# S01: Seed estándar: prisma db seed + dataset mínimo para auth

**Estandaricé `prisma db seed` y reforcé el seed con RBAC mínimo en DB (roles/permisos/userRoles) + documentación operativa.**

## What Happened

Se consolidó el flujo de seed alrededor de `prisma db seed` para que el entorno de desarrollo sea repetible y el login no dependa de estados implícitos. Se conectó Prisma seed al runner existente (tsx) y se reforzó el dataset mínimo para auth con RBAC real en base de datos: permisos base, roles por tenant y asignación de roles a usuarios demo. Además se documentó el paso de seed y credenciales de acceso para reducir fricción operativa.

Esto prepara el terreno para S02 (manejo suave cuando falta seed) y S03 (menús por rol desde single source apoyado en roles canónicos en DB).

## Verification

- `cd app && node --import tsx scripts/seed.mjs` imprime Start seeding... / Seeding finished.
- `cd app && npx prisma db seed` corre sin error.
- `cd app && node scripts/seed-check.mjs` confirma invariantes base.
- Verificación ad-hoc confirma roles canónicos y userRoles creados para el tenant demo.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Ninguna.

## Known Limitations

Aún existe fallback por email en auth para roles; se mantiene como compatibilidad pero ya no debería activarse con seed aplicado.

## Follow-ups

En S02 definir y aplicar un código de error estable (`SEED_REQUIRED`) y mapearlo a un mensaje UI accionable sin CallbackRouteError.
En S03 aprovechar roles DB canónicos para construir el single-source de menús.

## Files Created/Modified

- `app/prisma/schema.prisma` — Agregado `generator seed` para habilitar `prisma db seed` usando el runner TSX existente.
- `app/package.json` — Agregado script `prisma:seed` y mantenimiento de scripts de DB.
- `app/README.md` — Documentación de seed + credenciales demo.
- `app/prisma/seed.ts` — Extensión de seed para crear permissions/roles/userRoles en DB (RBAC mínimo).
