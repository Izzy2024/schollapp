---
id: T03
parent: S01
milestone: M005
provides: []
requires: []
affects: []
key_files: ["app/src/actions/__tests__/calendar.contract.test.ts", "app/prisma/seed.ts"]
key_decisions: ["Mantener tests como contract tests puros con seams globales, consistente con M003/M004 (sin mock.module).", "Seed idempotente: solo inserta eventos calendario si aún no hay ninguno en el tenant demo."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `pnpm -C app test` pasa con la suite nueva.
- `pnpm -C app lint` pasa.
- `pnpm -C app build` pasa.
- Smoke UI: login admin y crear evento “Día festivo” en `/admin/calendar` (visible en lista)."
completed_at: 2026-03-26T20:51:19.718Z
blocker_discovered: false
---

# T03: Agregados contract tests de calendario + seed demo events y smoke runtime verificado creando un evento en /admin/calendar.

> Agregados contract tests de calendario + seed demo events y smoke runtime verificado creando un evento en /admin/calendar.

## What Happened
---
id: T03
parent: S01
milestone: M005
key_files:
  - app/src/actions/__tests__/calendar.contract.test.ts
  - app/prisma/seed.ts
key_decisions:
  - Mantener tests como contract tests puros con seams globales, consistente con M003/M004 (sin mock.module).
  - Seed idempotente: solo inserta eventos calendario si aún no hay ninguno en el tenant demo.
duration: ""
verification_result: passed
completed_at: 2026-03-26T20:51:19.720Z
blocker_discovered: false
---

# T03: Agregados contract tests de calendario + seed demo events y smoke runtime verificado creando un evento en /admin/calendar.

**Agregados contract tests de calendario + seed demo events y smoke runtime verificado creando un evento en /admin/calendar.**

## What Happened

Se añadió suite de pruebas `calendar.contract.test.ts` bajo `app/src/actions/__tests__/` usando el patrón establecido (sin `mock.module`, con `globalThis.__TEST_SESSION__` y prisma real). Las pruebas cubren:
- RBAC: teacher/parent no pueden crear/eliminar; admin sí.
- tenant-scope: listados aislados por tenant.
- overlap de rango: eventos multi-día aparecen dentro del día consultado.

También se extendió `app/prisma/seed.ts` para crear eventos demo en el tenant `school-demo` (idempotente si ya existe algún evento).

En runtime, se corrigió la verificación de seed: `prisma db seed` no estaba configurado en package.json, así que se ejecutó el seed con `node prisma/seed.ts`. Con eso, el login demo funcionó y se verificó el flujo UI creando un evento desde `/admin/calendar` y confirmando que aparece en la lista.

## Verification

- `pnpm -C app test` pasa con la suite nueva.
- `pnpm -C app lint` pasa.
- `pnpm -C app build` pasa.
- Smoke UI: login admin y crear evento “Día festivo” en `/admin/calendar` (visible en lista).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && pnpm -s test` | 0 | ✅ pass | 0ms |
| 2 | `cd app && pnpm -s lint && pnpm -s test && pnpm -s build` | 0 | ✅ pass | 0ms |


## Deviations

En el plan decía usar `pnpm prisma db seed`, pero el proyecto no tiene seed configurado en package.json; se ejecutó el seed con `node prisma/seed.ts` para poblar usuarios demo. No cambia el resultado funcional, pero es un ajuste operativo.

## Known Issues

El seed de calendario crea eventos en fechas 2026-08/09, por lo que no aparecen en el rango por defecto (mes actual) hasta ajustar el filtro. El evento creado manualmente en la UI sí aparece. También hay un warning recurrente de Next sobre middleware→proxy (preexistente).

## Files Created/Modified

- `app/src/actions/__tests__/calendar.contract.test.ts`
- `app/prisma/seed.ts`


## Deviations
En el plan decía usar `pnpm prisma db seed`, pero el proyecto no tiene seed configurado en package.json; se ejecutó el seed con `node prisma/seed.ts` para poblar usuarios demo. No cambia el resultado funcional, pero es un ajuste operativo.

## Known Issues
El seed de calendario crea eventos en fechas 2026-08/09, por lo que no aparecen en el rango por defecto (mes actual) hasta ajustar el filtro. El evento creado manualmente en la UI sí aparece. También hay un warning recurrente de Next sobre middleware→proxy (preexistente).
