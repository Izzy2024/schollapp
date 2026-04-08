---
id: T03
parent: S02
milestone: M006
provides: []
requires: []
affects: []
key_files: ["app/src/components/UnderConstructionPage.tsx", "app/src/app/student/**", "app/src/app/admin/**", "app/src/app/director/**", "app/src/app/teacher/**", "app/src/app/parent/**", "app/prisma/seed.ts"]
key_decisions: ["Mantener el label textual "En construcción" en placeholders para diferenciar 'no implementado' vs bug real y facilitar smoke.", "Documentar la dependencia de seed para smoke/login en runbooks/UAT."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `pnpm -C app lint && pnpm -C app test && pnpm -C app build` pasan.
- Smoke browser: rutas representativas muestran "En construcción" y no hay errores en consola.
"
completed_at: 2026-03-27T19:30:33.020Z
blocker_discovered: false
---

# T03: Gates verdes y smoke por rol: menús ya no llevan a 404, muestran placeholders 'En construcción'.

> Gates verdes y smoke por rol: menús ya no llevan a 404, muestran placeholders 'En construcción'.

## What Happened
---
id: T03
parent: S02
milestone: M006
key_files:
  - app/src/components/UnderConstructionPage.tsx
  - app/src/app/student/**
  - app/src/app/admin/**
  - app/src/app/director/**
  - app/src/app/teacher/**
  - app/src/app/parent/**
  - app/prisma/seed.ts
key_decisions:
  - Mantener el label textual "En construcción" en placeholders para diferenciar 'no implementado' vs bug real y facilitar smoke.
  - Documentar la dependencia de seed para smoke/login en runbooks/UAT.
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:30:33.021Z
blocker_discovered: false
---

# T03: Gates verdes y smoke por rol: menús ya no llevan a 404, muestran placeholders 'En construcción'.

**Gates verdes y smoke por rol: menús ya no llevan a 404, muestran placeholders 'En construcción'.**

## What Happened

Se corrigió un problema operativo del dev server: estaba crasheando por lock/puerto ocupado (había una instancia previa de Next en 3000). Se terminó el proceso huérfano y se levantó un único `pnpm -C app dev`.

Se ejecutaron gates:
- `pnpm -C app lint`
- `pnpm -C app test`
- `pnpm -C app build`

Y se realizó smoke en runtime navegando rutas representativas por rol que antes eran 404 y ahora renderizan placeholders con el label "En construcción":
- Admin: `/admin/class-prep`
- Director: `/director/financials`
- Teacher: `/teacher/settings`
- Parent: `/parent/documents`
- Student: `/student/assignments`

Nota: el smoke depende de seed; si no hay usuarios demo puede aparecer `CallbackRouteError`. Se ejecutó `node app/prisma/seed.ts` para asegurar el login demo.

## Verification

- `pnpm -C app lint && pnpm -C app test && pnpm -C app build` pasan.
- Smoke browser: rutas representativas muestran "En construcción" y no hay errores en consola.


## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && pnpm -s lint && pnpm -s test && pnpm -s build` | 0 | ✅ pass | 0ms |
| 2 | `browser smoke: /admin/class-prep /director/financials /teacher/settings /parent/documents /student/assignments => 'En construcción' + no console errors` | 0 | ✅ pass | 0ms |


## Deviations

El plan original asumía que el dev server estaría estable. Hubo que matar un proceso Next huérfano en puerto 3000 para evitar el lock `.next/dev/lock`.

## Known Issues

El login demo puede fallar si la DB no está seeded (muestra "Algo salió mal"), se mitiga ejecutando `node app/prisma/seed.ts`.

## Files Created/Modified

- `app/src/components/UnderConstructionPage.tsx`
- `app/src/app/student/**`
- `app/src/app/admin/**`
- `app/src/app/director/**`
- `app/src/app/teacher/**`
- `app/src/app/parent/**`
- `app/prisma/seed.ts`


## Deviations
El plan original asumía que el dev server estaría estable. Hubo que matar un proceso Next huérfano en puerto 3000 para evitar el lock `.next/dev/lock`.

## Known Issues
El login demo puede fallar si la DB no está seeded (muestra "Algo salió mal"), se mitiga ejecutando `node app/prisma/seed.ts`.
