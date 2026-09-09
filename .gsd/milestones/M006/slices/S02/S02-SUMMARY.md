---
id: S02
parent: M006
milestone: M006
provides:
  - Menús principales sin 404 para todos los roles auditados (según inventario S01).
requires:
  []
affects:
  - M006/S03: hardening final + documentación UAT
key_files:
  - app/src/components/UnderConstructionPage.tsx
  - app/src/app/student/class-prep/page.tsx
  - app/src/app/student/attendance/page.tsx
  - app/src/app/student/exams/page.tsx
  - app/src/app/student/assignments/page.tsx
  - app/src/app/student/schedule/page.tsx
  - app/src/app/student/peers/page.tsx
  - app/src/app/student/messages/page.tsx
  - app/src/app/student/analytics/page.tsx
  - app/src/app/student/reports/page.tsx
  - app/src/app/student/news/page.tsx
  - app/src/app/student/activities/page.tsx
  - app/src/app/student/whats-new/page.tsx
  - app/src/app/student/settings/page.tsx
  - app/src/app/admin/class-prep/page.tsx
  - app/src/app/admin/exams/page.tsx
  - app/src/app/admin/assignments/page.tsx
  - app/src/app/admin/schedule/page.tsx
  - app/src/app/admin/analytics/page.tsx
  - app/src/app/admin/news/page.tsx
  - app/src/app/admin/activities/page.tsx
  - app/src/app/director/academic/page.tsx
  - app/src/app/director/financials/page.tsx
  - app/src/app/director/resources/page.tsx
  - app/src/app/director/accreditation/page.tsx
  - app/src/app/director/staff/page.tsx
  - app/src/app/teacher/news/page.tsx
  - app/src/app/teacher/settings/page.tsx
  - app/src/app/parent/documents/page.tsx
  - app/src/app/parent/news/page.tsx
  - app/src/app/parent/settings/page.tsx
key_decisions:
  - Usar páginas placeholder "En construcción" (opción A) para eliminar 404 visibles y mejorar claridad al usuario.
  - Incluir label textual "En construcción" para diferenciar falta de feature vs bug real y facilitar verificación.
patterns_established:
  - Placeholders por ruta deben ser consistentes y reutilizar `UnderConstructionPage`.
  - Smoke por rol debe ejecutar seed si login demo falla.
observability_surfaces:
  - Label "En construcción" como señal visual y verificable.
  - Gates lint/test/build como verificación operativa.
drill_down_paths:
  - milestones/M006/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M006/slices/S02/tasks/T02-SUMMARY.md
  - milestones/M006/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:31:03.003Z
blocker_discovered: false
---

# S02: Cerrar 404 con páginas "En construcción" + arreglar links de menú/breadcrumbs

**Eliminados 404 en rutas de menú por rol creando placeholders "En construcción" reutilizables y verificados con smoke + gates.**

## What Happened

Se aplicó la estrategia A para cerrar la experiencia de navegación por rol: en vez de devolver 404, las rutas no implementadas ahora renderizan una página consistente "En construcción".

Implementación:
- Se creó `UnderConstructionPage` como componente reutilizable con label "En construcción", copy y CTAs.
- Student: se añadieron placeholders para todas las rutas de menú que eran 404.
- Admin/Director/Teacher/Parent: se añadieron placeholders para todas las rutas de menú que eran 404 según inventario S01.

Operacional:
- Se resolvió un crash de `next dev` por lock/puerto ocupado (se terminó la instancia huérfana en 3000).
- Se ejecutaron gates lint/test/build y se hizo smoke por rol confirmando que las rutas representativas ya no muestran 404.


## Verification

- `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build` pasan.
- Smoke runtime por rol: rutas representativas muestran "En construcción" (no 404) y no hay errores en consola.


## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Se tuvo que matar un proceso Next huérfano para evitar lock `.next/dev/lock` y puerto 3000 ocupado.

## Known Limitations

Los placeholders no muestran necesariamente el menú completo del rol (en Student se dejó `menuGroups={[]}` para no duplicar). Se puede refinar después consolidando menús por rol.

## Follow-ups

(Opcional) Consolidar menús por rol en una sola fuente (evitar duplicación por página).

## Files Created/Modified

- `app/src/components/UnderConstructionPage.tsx` — Componente reusable con label "En construcción" y CTAs.
