---
id: T02
parent: S02
milestone: M006
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/class-prep/page.tsx", "app/src/app/admin/exams/page.tsx", "app/src/app/admin/assignments/page.tsx", "app/src/app/admin/schedule/page.tsx", "app/src/app/admin/analytics/page.tsx", "app/src/app/admin/news/page.tsx", "app/src/app/admin/activities/page.tsx", "app/src/app/director/academic/page.tsx", "app/src/app/director/financials/page.tsx", "app/src/app/director/resources/page.tsx", "app/src/app/director/accreditation/page.tsx", "app/src/app/director/staff/page.tsx", "app/src/app/teacher/news/page.tsx", "app/src/app/teacher/settings/page.tsx", "app/src/app/parent/documents/page.tsx", "app/src/app/parent/news/page.tsx", "app/src/app/parent/settings/page.tsx", "app/src/components/UnderConstructionPage.tsx"]
key_decisions: ["En vez de ocultar opciones, se crean placeholders visibles para que el menú no lleve a 404 y el usuario entienda que está pendiente."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `pnpm -C app lint` OK.
- `pnpm -C app build` OK.
- Smoke: navegar a rutas representativas muestra "En construcción" (no 404): /admin/activities, /teacher/news, /parent/documents, /director/financials."
completed_at: 2026-03-27T19:26:57.162Z
blocker_discovered: false
---

# T02: Creadas páginas placeholder para rutas 404 expuestas en menús de Admin/Director/Teacher/Parent; 0 404 en menús principales (según inventario).

> Creadas páginas placeholder para rutas 404 expuestas en menús de Admin/Director/Teacher/Parent; 0 404 en menús principales (según inventario).

## What Happened
---
id: T02
parent: S02
milestone: M006
key_files:
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
  - app/src/components/UnderConstructionPage.tsx
key_decisions:
  - En vez de ocultar opciones, se crean placeholders visibles para que el menú no lleve a 404 y el usuario entienda que está pendiente.
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:26:57.163Z
blocker_discovered: false
---

# T02: Creadas páginas placeholder para rutas 404 expuestas en menús de Admin/Director/Teacher/Parent; 0 404 en menús principales (según inventario).

**Creadas páginas placeholder para rutas 404 expuestas en menús de Admin/Director/Teacher/Parent; 0 404 en menús principales (según inventario).**

## What Happened

Se aplicó la opción A para eliminar 404 en rutas del menú (fuera de Student, ya cubierto en T01).

Admin: se agregaron placeholders para:
- /admin/class-prep
- /admin/exams
- /admin/assignments
- /admin/schedule
- /admin/analytics
- /admin/news
- /admin/activities

Director:
- /director/academic
- /director/financials
- /director/resources
- /director/accreditation
- /director/staff

Teacher:
- /teacher/news
- /teacher/settings

Parent:
- /parent/documents
- /parent/news
- /parent/settings

Todas estas páginas usan `UnderConstructionPage`, muestran label "En construcción" y un CTA para volver al dashboard del rol.

Se verificó que el build incluye las nuevas rutas (no 404).

## Verification

- `pnpm -C app lint` OK.
- `pnpm -C app build` OK.
- Smoke: navegar a rutas representativas muestra "En construcción" (no 404): /admin/activities, /teacher/news, /parent/documents, /director/financials.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && pnpm -s lint && pnpm -s build` | 0 | ✅ pass | 0ms |
| 2 | `Browser smoke: /admin/activities /teacher/news /parent/documents /director/financials muestran 'En construcción'` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

Los placeholders usan menús mínimos (no necesariamente idénticos al menú completo del rol) para evitar duplicación. En el futuro se puede consolidar menús por rol en una sola fuente.

## Files Created/Modified

- `app/src/app/admin/class-prep/page.tsx`
- `app/src/app/admin/exams/page.tsx`
- `app/src/app/admin/assignments/page.tsx`
- `app/src/app/admin/schedule/page.tsx`
- `app/src/app/admin/analytics/page.tsx`
- `app/src/app/admin/news/page.tsx`
- `app/src/app/admin/activities/page.tsx`
- `app/src/app/director/academic/page.tsx`
- `app/src/app/director/financials/page.tsx`
- `app/src/app/director/resources/page.tsx`
- `app/src/app/director/accreditation/page.tsx`
- `app/src/app/director/staff/page.tsx`
- `app/src/app/teacher/news/page.tsx`
- `app/src/app/teacher/settings/page.tsx`
- `app/src/app/parent/documents/page.tsx`
- `app/src/app/parent/news/page.tsx`
- `app/src/app/parent/settings/page.tsx`
- `app/src/components/UnderConstructionPage.tsx`


## Deviations
None.

## Known Issues
Los placeholders usan menús mínimos (no necesariamente idénticos al menú completo del rol) para evitar duplicación. En el futuro se puede consolidar menús por rol en una sola fuente.
