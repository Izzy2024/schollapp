---
id: T02
parent: S01
milestone: M008
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/enrollment/page.tsx", "app/src/app/teacher/classes/[sectionSubjectId]/page.tsx", "app/src/actions/enrollment-impl.ts", "app/src/actions/teacher.ts", "app/src/lib/nav/menu.ts"]
key_decisions: ["Para M008, el fix mínimo para el gap teacher es crear `/teacher/classes/page.tsx` como listado (usando data existente de `getTeacherDashboardData()`), ya que el detalle por `[sectionSubjectId]` ya existe.", "En admin, el placeholder `/admin/enrollment` se reemplazará conectando a `actions/enrollment-impl.ts` (ya implementa dominio y errores tipados)."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Lectura puntual de archivos y confirmación estructural (existencia/ausencia) + revisión de actions de dominio disponibles."
completed_at: 2026-03-27T21:16:58.339Z
blocker_discovered: false
---

# T02: Mapeé los gaps del happy path a archivos concretos: /admin/enrollment es placeholder intencional y /teacher/classes falta page.tsx; el dominio de enrollment ya existe.

> Mapeé los gaps del happy path a archivos concretos: /admin/enrollment es placeholder intencional y /teacher/classes falta page.tsx; el dominio de enrollment ya existe.

## What Happened
---
id: T02
parent: S01
milestone: M008
key_files:
  - app/src/app/admin/enrollment/page.tsx
  - app/src/app/teacher/classes/[sectionSubjectId]/page.tsx
  - app/src/actions/enrollment-impl.ts
  - app/src/actions/teacher.ts
  - app/src/lib/nav/menu.ts
key_decisions:
  - Para M008, el fix mínimo para el gap teacher es crear `/teacher/classes/page.tsx` como listado (usando data existente de `getTeacherDashboardData()`), ya que el detalle por `[sectionSubjectId]` ya existe.
  - En admin, el placeholder `/admin/enrollment` se reemplazará conectando a `actions/enrollment-impl.ts` (ya implementa dominio y errores tipados).
duration: ""
verification_result: passed
completed_at: 2026-03-27T21:16:58.340Z
blocker_discovered: false
---

# T02: Mapeé los gaps del happy path a archivos concretos: /admin/enrollment es placeholder intencional y /teacher/classes falta page.tsx; el dominio de enrollment ya existe.

**Mapeé los gaps del happy path a archivos concretos: /admin/enrollment es placeholder intencional y /teacher/classes falta page.tsx; el dominio de enrollment ya existe.**

## What Happened

Se localizó el código exacto detrás de los gaps identificados.

Gap A — `/admin/enrollment`:
- Archivo: `app/src/app/admin/enrollment/page.tsx`
- Estado: placeholder intencional (comentario indica que un intento previo rompió build al importar código server-only en client).
- Fix type: reemplazar con implementación mínima cuidando server/client split. Acciones dominio ya existen en `app/src/actions/enrollment-impl.ts` (getEnrollments/enrollStudent/unenroll/reenroll + errores tipados).

Gap B — `/teacher/classes` 404:
- Carpeta existe pero solo tiene `[sectionSubjectId]/page.tsx`.
- Falta: `app/src/app/teacher/classes/page.tsx` (listado).
- Ya existe detalle para un sectionSubjectId, consumiendo `getClassDetail/getClassStudents/getClassAttendanceHistory`.
- Fix type: agregar listado que use `actions/teacher.ts:getTeacherDashboardData()` (ya arma `classes` con ids `ss.id`) y linkee a `/teacher/classes/[sectionSubjectId]`.

Dependencias de datos:
- Teacher dashboard obtiene sectionSubjects via Staff.sectionSubjects (seed los crea en `prisma/seed.ts`).
- Enrollment dominio depende de AcademicYear activo (seed lo crea `2025-2026` con isActive=true) y Sections (seed crea secciones A/B).


## Verification

Lectura puntual de archivos y confirmación estructural (existencia/ausencia) + revisión de actions de dominio disponibles.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `read admin/enrollment/page.tsx + find teacher/classes tree + read enrollment-impl.ts` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

`/admin/enrollment/page.tsx` fue dejado como placeholder por un build break previo al importar server-only code en un client component. El fix debe respetar separación server/client.

## Files Created/Modified

- `app/src/app/admin/enrollment/page.tsx`
- `app/src/app/teacher/classes/[sectionSubjectId]/page.tsx`
- `app/src/actions/enrollment-impl.ts`
- `app/src/actions/teacher.ts`
- `app/src/lib/nav/menu.ts`


## Deviations
Ninguna.

## Known Issues
`/admin/enrollment/page.tsx` fue dejado como placeholder por un build break previo al importar server-only code en un client component. El fix debe respetar separación server/client.
