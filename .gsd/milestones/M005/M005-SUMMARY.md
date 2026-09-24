---
id: M005
title: "Post-lanzamiento: Calendario global + Cierre de requirements + UAT real"
status: complete
completed_at: 2026-03-26T21:11:53.494Z
key_decisions:
  - D009: DB `.gsd/gsd.db` como fuente de verdad para requirements; `REQUIREMENTS.md` se regenera vía herramientas.
key_files:
  - .gsd/milestones/M005/M005-ROADMAP.md
  - .gsd/milestones/M005/M005-VALIDATION.md
  - .gsd/milestones/M005/M005-RUNBOOK.md
  - .gsd/REQUIREMENTS.md
  - .gsd/DECISIONS.md
  - app/prisma/schema.prisma
  - app/prisma/migrations/20260326203850_school_calendar_event/migration.sql
  - app/src/actions/calendar.ts
  - app/src/app/admin/calendar/page.tsx
  - app/src/app/teacher/calendar/page.tsx
  - app/src/app/parent/calendar/page.tsx
  - app/src/actions/__tests__/calendar.contract.test.ts
lessons_learned:
  - El DB de GSD puede derivar del markdown si no se usan herramientas; preferir DB como fuente de verdad y evitar ediciones manuales de REQUIREMENTS.
  - Si `prisma db seed` no está configurado, el smoke puede fallar con errores de login; documentar y/o estandarizar seed para evitar falsos positivos.
---

# M005: Post-lanzamiento: Calendario global + Cierre de requirements + UAT real

**Calendario global implementado, requirements alineados con evidencia y runbook/UAT listos para operación post-lanzamiento.**

## What Happened

M005 cerró pendientes post-lanzamiento con tres entregables: calendario global, consistencia del contrato de requirements y documentación operativa.

1) Calendario Escolar Global (R011): se agregó `SchoolCalendarEvent` tenant-scoped con acciones server (list/create/update/delete) y UI por rol en `/admin/calendar`, `/teacher/calendar`, `/parent/calendar`, además de tests contract y seed demo.

2) Requirements: se reparó la deriva entre `.gsd/REQUIREMENTS.md` y el DB de GSD importando requirements al DB y alineando R001–R011 a `validated` con evidencia citando milestones completados. Se registró la decisión D009 declarando el DB como fuente de verdad.

3) Operación: se reemplazaron UAT placeholders por scripts reales y se creó `M005-RUNBOOK.md` con smoke checklist por rol y guía de diagnóstico (Activity feed y errores estables).

## Success Criteria Results

- Calendario global: cumplido (S01).
- Requirements coherentes: cumplido (S02).
- UAT + runbook: cumplido (S03).
- Gates lint/test/build: cumplido (S01 verification).

## Definition of Done Results

- [x] S01–S03 completadas (roadmap M005).
- [x] Calendario global usable y sin regresiones: implementado + build/test/lint en verde (ver S01).
- [x] Requirements y artifacts coherentes: REQUIREMENTS.md regenerado desde DB, D009 registrada, UAT placeholders reemplazados.
- [x] Verificación contract+integration+operational pasa (ver validación M005).

## Requirement Outcomes

- R011: Validated con evidencia de M005/S01 (modelo+acciones+UI+tests).
- R001–R010: Validated con evidencia citando M001–M004 (y evidencia completada para R007/R009).
- Contrato actual: 11/11 requirements en status validated en DB.

## Deviations

None.

## Follow-ups

None.
