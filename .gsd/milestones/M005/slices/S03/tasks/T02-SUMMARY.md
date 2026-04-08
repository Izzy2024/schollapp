---
id: T02
parent: S03
milestone: M005
provides: []
requires: []
affects: []
key_files: [".gsd/milestones/M005/M005-RUNBOOK.md"]
key_decisions: []
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- Archivo creado en `.gsd/milestones/M005/M005-RUNBOOK.md`."
completed_at: 2026-03-26T21:05:18.980Z
blocker_discovered: false
---

# T02: Escrito runbook post-lanzamiento (smoke + diagnóstico) para módulos clave, incluyendo seed y requirements health checks.

> Escrito runbook post-lanzamiento (smoke + diagnóstico) para módulos clave, incluyendo seed y requirements health checks.

## What Happened
---
id: T02
parent: S03
milestone: M005
key_files:
  - .gsd/milestones/M005/M005-RUNBOOK.md
key_decisions:
  - (none)
duration: ""
verification_result: passed
completed_at: 2026-03-26T21:05:18.981Z
blocker_discovered: false
---

# T02: Escrito runbook post-lanzamiento (smoke + diagnóstico) para módulos clave, incluyendo seed y requirements health checks.

**Escrito runbook post-lanzamiento (smoke + diagnóstico) para módulos clave, incluyendo seed y requirements health checks.**

## What Happened

Se creó `.gsd/milestones/M005/M005-RUNBOOK.md` con un checklist de smoke por rol (admin/director/teacher/parent), rutas clave del sistema (finanzas, mensajes, calendario, asistencia, anuncios, planning) y notas de diagnóstico.

Incluye:
- cómo ejecutar seed (`node app/prisma/seed.ts`) para evitar fallas de login `CallbackRouteError`
- dónde verificar Activity (`/director/activity`) y qué eventos esperar (finance.*, communication.*)
- health check rápido de requirements DB (`validated|11`) y referencia a decisión D009.
- limitación conocida: `STATE.md` puede quedar desfasado.


## Verification

- Archivo creado en `.gsd/milestones/M005/M005-RUNBOOK.md`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f .gsd/milestones/M005/M005-RUNBOOK.md` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

El runbook asume dev/local. Para producción se necesitará adaptar seed/credenciales.

## Files Created/Modified

- `.gsd/milestones/M005/M005-RUNBOOK.md`


## Deviations
None.

## Known Issues
El runbook asume dev/local. Para producción se necesitará adaptar seed/credenciales.
