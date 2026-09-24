---
id: S01
parent: M005
milestone: M005
provides:
  - R011 base implementada (eventos globales).
  - Superficie UI y acciones listas para extender con ActivityEvent o mejoras de calendario si se requiere.
requires:
  []
affects:
  - M005/S02: requirements sync + status evidence
  - M005/S03: UAT + runbook (usar seed de calendario)
key_files:
  - app/prisma/schema.prisma
  - app/prisma/migrations/20260326203850_school_calendar_event/migration.sql
  - app/src/actions/calendar.ts
  - app/src/lib/errors.ts
  - app/src/app/admin/calendar/page.tsx
  - app/src/app/teacher/calendar/page.tsx
  - app/src/app/parent/calendar/page.tsx
  - app/src/actions/__tests__/calendar.contract.test.ts
  - app/prisma/seed.ts
key_decisions:
  - Modelo simple `SchoolCalendarEvent` (eventos globales) para R011; se excluyen horarios y detalles complejos.
  - RBAC: admin/director escriben; teacher/parent leen; enforcement en server actions.
  - Tests contract sin `mock.module` usando seams globales para sesión/prisma, alineado al patrón del repo.
patterns_established:
  - Server actions tenant-scoped reutilizando patrón requireSession/tenant resolution por sesión (slug o id).
  - Contract tests con seams globales (`__TEST_SESSION__`, `__TEST_PRISMA__`) sin `mock.module`.
observability_surfaces:
  - Errores estables via STABLE_ERROR (CALENDAR_FORBIDDEN, CALENDAR_EVENT_NOT_FOUND, INVALID_TARGET).
drill_down_paths:
  - milestones/M005/slices/S01/tasks/T01-SUMMARY.md
  - milestones/M005/slices/S01/tasks/T02-SUMMARY.md
  - milestones/M005/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-26T20:52:38.951Z
blocker_discovered: false
---

# S01: Calendario Escolar Global (modelo + acciones + UI mínima + tests)

**Calendario escolar global implementado (modelo+acciones+UI por rol) con tests contract y seed demo.**

## What Happened

Se implementó el Calendario Escolar Global (R011) con alcance acotado a eventos globales por tenant.

- DB: nuevo modelo Prisma `SchoolCalendarEvent` con índices por tenant y fechas.
- Server actions: listado por rango (overlap), create/update/delete con tenant-scope derivado de sesión y RBAC.
- UI: `/admin/calendar` (crear/listar/eliminar) y vistas de solo lectura `/teacher/calendar` y `/parent/calendar`.
- Tests: suite contract para RBAC, tenant-scope y lógica de overlap sin `mock.module`.
- Seed: se agregaron eventos demo idempotentes para tenant `school-demo`.

Smoke runtime: login admin + crear evento desde UI y verificar que aparece en la lista.

## Verification

- `pnpm -C app lint` pasa.
- `pnpm -C app test` pasa (incluye `calendar.contract.test.ts`).
- `pnpm -C app build` pasa.
- Smoke UI: login admin y crear evento en `/admin/calendar` (visible en lista).

## Requirements Advanced

- R011 — Implementación inicial de eventos globales tenant-scoped con UI por rol y pruebas contract.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

El seed no está configurado via `prisma db seed` en package.json; para smoke se usó `node prisma/seed.ts`.

## Known Limitations

El calendario UI es una lista (no vista tipo calendario) y el default range es el mes actual; eventos seeded pueden no aparecer si están fuera del rango. No se emite ActivityEvent para calendar.* (se dejó opcional).

## Follow-ups

- (Opcional) Agregar `prisma.seed` en package.json para que `prisma db seed` funcione de forma estándar.
- (Opcional) Mejorar el rango por defecto del calendario para que muestre eventos seeded (actualmente seed usa fechas 2026-08/09).

## Files Created/Modified

- `app/prisma/schema.prisma` — Añadido modelo `SchoolCalendarEvent` y relación inversa para createdBy.
- `app/prisma/migrations/20260326203850_school_calendar_event/migration.sql` — Migración SQLite para tabla SchoolCalendarEvent + índices.
- `app/src/actions/calendar.ts` — Server actions calendario (list/create/update/delete) con tenant-scope y RBAC.
- `app/src/lib/errors.ts` — Códigos de error estables para calendario.
- `app/src/app/admin/calendar/page.tsx` — UI calendario admin (crear/listar/eliminar).
- `app/src/app/teacher/calendar/page.tsx` — UI calendario teacher (read).
- `app/src/app/parent/calendar/page.tsx` — UI calendario parent (read).
- `app/src/actions/__tests__/calendar.contract.test.ts` — Contract tests calendario (RBAC/tenant/overlap).
- `app/prisma/seed.ts` — Seed: eventos de calendario demo idempotentes para tenant school-demo.
