---
id: T01
parent: S01
milestone: M006
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/** (navegación existente)"]
key_decisions: []
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Verificación manual en runtime con browser tools; se observó texto "404" en las rutas listadas como 404."
completed_at: 2026-03-26T21:38:32.850Z
blocker_discovered: false
---

# T01: Mapeadas rutas del menú Admin y detectadas múltiples rutas 404 presentes en navegación.

> Mapeadas rutas del menú Admin y detectadas múltiples rutas 404 presentes en navegación.

## What Happened
---
id: T01
parent: S01
milestone: M006
key_files:
  - app/src/app/admin/** (navegación existente)
key_decisions:
  - (none)
duration: ""
verification_result: passed
completed_at: 2026-03-26T21:38:32.851Z
blocker_discovered: false
---

# T01: Mapeadas rutas del menú Admin y detectadas múltiples rutas 404 presentes en navegación.

**Mapeadas rutas del menú Admin y detectadas múltiples rutas 404 presentes en navegación.**

## What Happened

En runtime (localhost) se inició sesión como Admin y se extrajeron los hrefs del menú lateral vía snapshot. Se navegó a cada ruta de menú sospechosa y se confirmó que varias están devolviendo 404 aunque aparecen en navegación.

Rutas Admin OK (muestra UI, no 404):
- /admin
- /admin/subjects
- /admin/classes
- /admin/staff
- /admin/class-requests
- /admin/schedule-requests
- /admin/students
- /admin/enrollment
- /admin/attendance
- /admin/messages
- /admin/reports
- /admin/settings

Rutas Admin 404 (aparecen en menú):
- /admin/class-prep
- /admin/exams
- /admin/assignments
- /admin/schedule
- /admin/analytics
- /admin/news
- /admin/activities

Esto alimenta S02 para aplicar opción A (páginas "En construcción") y/o corregir links si apuntan mal.

## Verification

Verificación manual en runtime con browser tools; se observó texto "404" en las rutas listadas como 404.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Browser navigation + asserts de texto '404' en rutas admin listadas` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

Aún no se determinó si algunas rutas deberían apuntar a rutas existentes (ej. director/overview vs director), eso se consolida en inventario final.

## Files Created/Modified

- `app/src/app/admin/** (navegación existente)`


## Deviations
None.

## Known Issues
Aún no se determinó si algunas rutas deberían apuntar a rutas existentes (ej. director/overview vs director), eso se consolida en inventario final.
