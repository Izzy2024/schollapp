---
id: T01
parent: S01
milestone: M005
provides: []
requires: []
affects: []
key_files: ["app/prisma/schema.prisma", "app/prisma/migrations/20260326203850_school_calendar_event/migration.sql", "app/src/actions/calendar.ts", "app/src/lib/errors.ts"]
key_decisions: ["Modelo único `SchoolCalendarEvent` tenant-scoped para eventos globales (no horarios) con campos mínimos startAt/endAt/allDay.", "RBAC: escrituras restringidas a roles admin/director; lectura para cualquier usuario autenticado del tenant (por ahora).", "Tenant resolution y stable errors siguen el patrón existente de messages.ts (acepta tenantSlug o tenantId desde sesión/test seam)."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `npx prisma migrate dev --name school_calendar_event --skip-seed` aplicado OK.
- `pnpm -C app lint` OK.
- `pnpm -C app test` OK.
- `pnpm -C app build` OK."
completed_at: 2026-03-26T20:39:46.582Z
blocker_discovered: false
---

# T01: Agregado modelo `SchoolCalendarEvent` + migración y server actions calendario tenant-scoped con RBAC y errores estables.

> Agregado modelo `SchoolCalendarEvent` + migración y server actions calendario tenant-scoped con RBAC y errores estables.

## What Happened
---
id: T01
parent: S01
milestone: M005
key_files:
  - app/prisma/schema.prisma
  - app/prisma/migrations/20260326203850_school_calendar_event/migration.sql
  - app/src/actions/calendar.ts
  - app/src/lib/errors.ts
key_decisions:
  - Modelo único `SchoolCalendarEvent` tenant-scoped para eventos globales (no horarios) con campos mínimos startAt/endAt/allDay.
  - RBAC: escrituras restringidas a roles admin/director; lectura para cualquier usuario autenticado del tenant (por ahora).
  - Tenant resolution y stable errors siguen el patrón existente de messages.ts (acepta tenantSlug o tenantId desde sesión/test seam).
duration: ""
verification_result: passed
completed_at: 2026-03-26T20:39:46.583Z
blocker_discovered: false
---

# T01: Agregado modelo `SchoolCalendarEvent` + migración y server actions calendario tenant-scoped con RBAC y errores estables.

**Agregado modelo `SchoolCalendarEvent` + migración y server actions calendario tenant-scoped con RBAC y errores estables.**

## What Happened

Se agregó un modelo Prisma `SchoolCalendarEvent` tenant-scoped y la relación inversa en `User` para evitar error de Prisma (faltaba el opposite relation field). Se creó y aplicó la migración en SQLite. Se añadieron códigos de error estables para calendario y se implementaron server actions CRUD/listado por rango en `app/src/actions/calendar.ts`, siguiendo el patrón de resolución de tenant por sesión utilizado en mensajería.

Verifiqué que `pnpm lint`, `pnpm test` y `pnpm build` sigan en verde tras los cambios.

## Verification

- `npx prisma migrate dev --name school_calendar_event --skip-seed` aplicado OK.
- `pnpm -C app lint` OK.
- `pnpm -C app test` OK.
- `pnpm -C app build` OK.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && npx prisma migrate dev --name school_calendar_event --skip-seed` | 0 | ✅ pass | 0ms |
| 2 | `cd app && pnpm -s lint` | 0 | ✅ pass | 0ms |
| 3 | `cd app && pnpm -s test` | 0 | ✅ pass | 0ms |
| 4 | `cd app && pnpm -s build` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

Aún no hay UI/rutas para calendario (T02) ni tests contract específicos (T03).

## Files Created/Modified

- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260326203850_school_calendar_event/migration.sql`
- `app/src/actions/calendar.ts`
- `app/src/lib/errors.ts`


## Deviations
None.

## Known Issues
Aún no hay UI/rutas para calendario (T02) ni tests contract específicos (T03).
