---
id: S01
parent: M006
milestone: M006
provides:
  - Inventario trazable por rol para ejecución de fixes/placeholders en S02.
requires:
  []
affects:
  - M006/S02 placeholders + navegación
key_files:
  - .gsd/milestones/M006/slices/S01/S01-INVENTORY.md
key_decisions:
  - (none)
patterns_established:
  - Auditoría por rol debe basarse en navegación runtime, no solo en árbol de archivos.
  - Clasificar cada ruta como OK/404/Error/En construcción para no confundir falta de feature con bug real.
observability_surfaces:
  - Artifact inventario: `.gsd/milestones/M006/slices/S01/S01-INVENTORY.md`
drill_down_paths:
  - milestones/M006/slices/S01/tasks/T01-SUMMARY.md
  - milestones/M006/slices/S01/tasks/T02-SUMMARY.md
  - milestones/M006/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-26T21:39:29.890Z
blocker_discovered: false
---

# S01: Inventario por rol: mapa de rutas + detección de 404/errores + priorización

**Inventario por rol completado: rutas del menú mapeadas a OK/404 y prioridades definidas para eliminar 404 con placeholders.**

## What Happened

Se levantó el dev server y se recorrieron los menús por rol (Admin/Director/Teacher/Parent/Student) navegando cada href para clasificar el estado real.

Hallazgo principal: existen múltiples rutas 404 expuestas en menús, especialmente en Student (casi todo el menú es 404). Admin también tiene varias rutas 404 en menú. Director/Teacher/Parent tienen menos pero visibles (settings/news/documents).

Se consolidó todo en un artifact `S01-INVENTORY.md` con lista por rol y Top 10 prioridades para ejecutar en S02 con la estrategia A (páginas "En construcción" + enlaces corregidos).

## Verification

Verificación por navegación real en runtime (browser tools): asserts de texto '404' para rutas fallidas y asserts de URL para rutas OK. Artifact `S01-INVENTORY.md` creado.

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

El inventario cubre rutas del menú; rutas fuera del menú podrían requerir revisión adicional.

## Follow-ups

Ejecutar S02 para reemplazar 404 con páginas "En construcción" y/o corregir enlaces a rutas existentes, empezando por Student.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S01/S01-INVENTORY.md` — Inventario consolidado por rol (OK/404) + Top 10 prioridades.
