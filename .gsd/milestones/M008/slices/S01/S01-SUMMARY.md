---
id: S01
parent: M008
milestone: M008
provides:
  - Lista exacta de bloqueos del happy path con ruta→archivo→tipo de fix.
  - Orden mínimo de cierre para avanzar demo end-to-end (Admin enrollment + Teacher classes).
requires:
  []
affects:
  - M008/S02 (Admin inscripción mínima)
  - M008/S03 (Teacher asistencia mínima)
key_files:
  - .gsd/milestones/M008/slices/S01/S01-PLAN.md
  - .gsd/milestones/M008/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M008/slices/S01/tasks/T02-SUMMARY.md
key_decisions:
  - Priorizar arreglar rutas del happy path antes de construir asistencia, porque teacher no puede llegar a 'Mis Clases'.
  - Para el fix mínimo teacher, crear `/teacher/classes/page.tsx` como listado usando `getTeacherDashboardData()` (detalle ya existe).
  - Para el fix mínimo admin, reemplazar placeholder `/admin/enrollment` conectándolo a `actions/enrollment-impl.ts` respetando el split server/client.
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M008/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M008/slices/S01/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T18:54:54.358Z
blocker_discovered: false
---

# S01: Ruta crítica: mapa del happy path + gaps (En construcción/errores)

**Mapeé el happy path Admin→Teacher y convertí los bloqueos detectados en una lista accionable de gaps con rutas, archivos y tipo de fix mínimo.**

## What Happened

Este slice se enfocó en reducir incertidumbre antes de implementar features: se recorrió el flujo de demo end-to-end (Admin: inscripción; Teacher: ver clases; asistencia) sobre una base seeded, y se documentaron bloqueos reales.

Hallazgos principales:
- `/admin/enrollment` carga pero es un placeholder explícito (“Página en construcción”), por lo que el paso de inscripción del happy path está bloqueado.
- `/teacher/classes` devuelve 404 porque falta `page.tsx` en la ruta (solo existe el detalle `[sectionSubjectId]`). El menú teacher apunta a esa ruta, por lo que la navegación del happy path falla.

Luego se mapeó cada gap a archivos concretos y se verificó que el dominio backend para enrollment ya existe (actions en `enrollment-impl.ts`) y que existe data suficiente en seed para soportar el fix mínimo. Se definió el plan mínimo de cierre por orden: crear listado teacher en `/teacher/classes/page.tsx` usando `getTeacherDashboardData()`, y reemplazar placeholder admin en `/admin/enrollment/page.tsx` conectándolo a acciones server sin romper el split server/client.

## Verification

- Seed aplicado y verificado: `node --import tsx scripts/seed.mjs` + `node scripts/seed-check.mjs`.
- Smoke en browser:
  - `/admin/enrollment` muestra placeholder `Página en construcción.`.
  - `/teacher/classes` responde 404.
  - `/teacher/classes/123` muestra error controlado `No se pudo cargar la clase`.
- Verificación por lectura puntual/structural:
  - Confirmado placeholder en `app/src/app/admin/enrollment/page.tsx`.
  - Confirmado que falta `app/src/app/teacher/classes/page.tsx`.
  - Confirmado dominio de enrollment disponible en `app/src/actions/enrollment-impl.ts` y data requerida existente en seed (AcademicYear activo, Sections, SectionSubjects).

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

Este slice no implementa fixes; solo identifica y aterriza los gaps a nivel de rutas/archivos y define el mínimo viable de cierre. La ruta `/teacher/classes/123` usada en exploración no corresponde necesariamente a un `sectionSubjectId` real (fue una navegación manual para observar la superficie de error).

## Follow-ups

Implementar los fixes mínimos en los slices siguientes:
- S02: reemplazar placeholder `/admin/enrollment` con UI mínima que use actions server correctamente.
- S02/S03: agregar `/teacher/classes/page.tsx` (listado) y asegurar links a detalle real por `sectionSubjectId`.

## Files Created/Modified

- `.gsd/milestones/M008/slices/S01/S01-PLAN.md` — Plan con tareas T01-T02 completadas para mapear el happy path y localizar gaps.
- `.gsd/milestones/M008/slices/S01/tasks/T01-SUMMARY.md` — Evidencia de exploración en browser, seed aplicado y bloqueos detectados.
- `.gsd/milestones/M008/slices/S01/tasks/T02-SUMMARY.md` — Tabla mental gap→ruta→archivo y decisión de fix mínimo basado en actions existentes.
