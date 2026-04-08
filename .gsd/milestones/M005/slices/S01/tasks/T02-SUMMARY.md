---
id: T02
parent: S01
milestone: M005
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/calendar/page.tsx", "app/src/app/teacher/calendar/page.tsx", "app/src/app/parent/calendar/page.tsx"]
key_decisions: ["UI simple basada en listas + rango por mes, sin componente calendario visual para minimizar complejidad.", "Teacher/Parent son solo lectura; Admin/Director puede crear/eliminar (RBAC se aplica en server actions)."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `pnpm -C app lint` OK.
- `pnpm -C app build` OK (rutas nuevas aparecen en la tabla de rutas)."
completed_at: 2026-03-26T20:42:26.560Z
blocker_discovered: false
---

# T02: Agregadas pantallas de Calendario por rol: admin (crear/eliminar/listar) y vistas de solo lectura para teacher/parent.

> Agregadas pantallas de Calendario por rol: admin (crear/eliminar/listar) y vistas de solo lectura para teacher/parent.

## What Happened
---
id: T02
parent: S01
milestone: M005
key_files:
  - app/src/app/admin/calendar/page.tsx
  - app/src/app/teacher/calendar/page.tsx
  - app/src/app/parent/calendar/page.tsx
key_decisions:
  - UI simple basada en listas + rango por mes, sin componente calendario visual para minimizar complejidad.
  - Teacher/Parent son solo lectura; Admin/Director puede crear/eliminar (RBAC se aplica en server actions).
duration: ""
verification_result: passed
completed_at: 2026-03-26T20:42:26.560Z
blocker_discovered: false
---

# T02: Agregadas pantallas de Calendario por rol: admin (crear/eliminar/listar) y vistas de solo lectura para teacher/parent.

**Agregadas pantallas de Calendario por rol: admin (crear/eliminar/listar) y vistas de solo lectura para teacher/parent.**

## What Happened

Se implementaron rutas de UI para el calendario escolar siguiendo el patrón existente (páginas client con DashboardLayout y Ant Design).

- `/admin/calendar`: permite listar eventos por rango, buscar, crear evento (modal) y eliminar.
- `/teacher/calendar` y `/parent/calendar`: vistas de solo lectura con rango + búsqueda.

Las páginas consumen `listCalendarEvents` y el admin usa también `createCalendarEvent`/`deleteCalendarEvent`.

Verifiqué que el build incluye las nuevas rutas sin errores de TypeScript y que lint permanece en verde.

## Verification

- `pnpm -C app lint` OK.
- `pnpm -C app build` OK (rutas nuevas aparecen en la tabla de rutas).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && pnpm -s lint` | 0 | ✅ pass | 0ms |
| 2 | `cd app && pnpm -s build` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

El menú global/landing de cada rol aún no enlaza al calendario (solo está accesible por URL directa o desde el menú local de la página). También falta cubrir RBAC con tests (T03).

## Files Created/Modified

- `app/src/app/admin/calendar/page.tsx`
- `app/src/app/teacher/calendar/page.tsx`
- `app/src/app/parent/calendar/page.tsx`


## Deviations
None.

## Known Issues
El menú global/landing de cada rol aún no enlaza al calendario (solo está accesible por URL directa o desde el menú local de la página). También falta cubrir RBAC con tests (T03).
