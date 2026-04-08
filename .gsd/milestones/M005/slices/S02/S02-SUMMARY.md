---
id: S02
parent: M005
milestone: M005
provides:
  - Requirements coherentes y trazables para todo el contrato actual.
  - Herramientas gsd operables (no más 'Requirement not found').
requires:
  []
affects:
  - M005/S03: UAT + runbook (usar requirements y decision D009)
key_files:
  - .gsd/gsd.db
  - .gsd/REQUIREMENTS.md
  - .gsd/runtime/requirements-import.sql
  - .gsd/DECISIONS.md
  - .gsd/STATE.md
key_decisions:
  - D009: El DB `.gsd/gsd.db` es la fuente de verdad para requirements; `REQUIREMENTS.md` se regenera vía herramientas.
patterns_established:
  - Usar `gsd_requirement_update` para cualquier cambio de requirements; evitar ediciones manuales al markdown.
  - Si el DB de requirements está vacío, reimportar desde markdown y continuar con herramientas.
observability_surfaces:
  - Query de salud: `sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"`
drill_down_paths:
  - milestones/M005/slices/S02/tasks/T01-SUMMARY.md
  - milestones/M005/slices/S02/tasks/T02-SUMMARY.md
  - milestones/M005/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-26T20:57:53.066Z
blocker_discovered: false
---

# S02: Cierre de requirements: sincronización DB + status correcto + evidencia

**Requirements sincronizados al DB y alineados con evidencia; patrón de mantenimiento documentado.**

## What Happened

Se cerró la deriva entre `.gsd/REQUIREMENTS.md` y el DB de GSD.

Hallazgo: el markdown tenía requirements, pero la tabla `requirements` del DB estaba vacía, rompiendo `gsd_requirement_update` y dejando conteos inconsistentes.

Acciones:
- Se importaron requirements al DB desde el markdown (reparación puntual).
- Se actualizó el estado de R001–R011 a `validated` con evidencia citando milestones/slices completados.
- Se completó evidencia faltante para R007 y R009.
- Se registró la decisión D009: DB como fuente de verdad; no editar REQUIREMENTS.md manualmente.

Resultado: `sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"` devuelve `validated|11` y `REQUIREMENTS.md` se regeneró coherente.

## Verification

- `sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"` => `validated|11`.
- `.gsd/REQUIREMENTS.md` muestra R001–R011 en Validated con evidencia.
- `gsd_requirement_update` funciona (no hay 'Requirement not found').

## Requirements Advanced

- R001 — Marcado Validated con evidencia M001.
- R002 — Marcado Validated con evidencia M001.
- R003 — Marcado Validated con evidencia M001.
- R004 — Marcado Validated con evidencia M002.
- R005 — Marcado Validated con evidencia M002.
- R006 — Marcado Validated con evidencia M002.
- R007 — Evidencia completada y validación M003.
- R008 — Validación alineada a M004.
- R009 — Evidencia completada y validación M003.
- R010 — Marcado Validated con evidencia M001.
- R011 — Validación con evidencia M005/S01.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Se usó un script SQL puntual `.gsd/runtime/requirements-import.sql` para reimportar requirements al DB (reparación) porque el DB estaba vacío aunque existía el markdown.

## Known Limitations

`STATE.md` sigue desactualizado (conteos y milestone activo) y requiere un gatillo/flujo GSD para regenerarse; no bloquea el uso del DB ni updates.

## Follow-ups

Gatillar regeneración de `STATE.md`/milestone activo al validar/cerrar M004 y/o al finalizar M005, para que los conteos reflejen el DB actual.

## Files Created/Modified

- `.gsd/runtime/requirements-import.sql` — Script puntual para reimportar requirements al DB.
- `.gsd/REQUIREMENTS.md` — Regenerado desde DB con estados y evidencias actualizadas.
- `.gsd/DECISIONS.md` — Decisión D009 sobre fuente de verdad (DB) para requirements.
