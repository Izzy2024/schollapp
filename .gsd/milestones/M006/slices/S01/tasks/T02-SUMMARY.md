---
id: T02
parent: S01
milestone: M006
provides: []
requires: []
affects: []
key_files: ["app/src/app/teacher/**", "app/src/app/parent/**", "app/src/app/student/**", "app/src/app/director/**"]
key_decisions: []
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Verificación manual en runtime con browser tools; asserts de '404' en rutas listadas como 404 y asserts de url_contains en rutas OK."
completed_at: 2026-03-26T21:38:47.208Z
blocker_discovered: false
---

# T02: Mapeadas rutas de menú para Teacher/Parent/Student/Director y detectadas 404 masivas en Student y varias en Director/Teacher/Parent.

> Mapeadas rutas de menú para Teacher/Parent/Student/Director y detectadas 404 masivas en Student y varias en Director/Teacher/Parent.

## What Happened
---
id: T02
parent: S01
milestone: M006
key_files:
  - app/src/app/teacher/**
  - app/src/app/parent/**
  - app/src/app/student/**
  - app/src/app/director/**
key_decisions:
  - (none)
duration: ""
verification_result: passed
completed_at: 2026-03-26T21:38:47.208Z
blocker_discovered: false
---

# T02: Mapeadas rutas de menú para Teacher/Parent/Student/Director y detectadas 404 masivas en Student y varias en Director/Teacher/Parent.

**Mapeadas rutas de menú para Teacher/Parent/Student/Director y detectadas 404 masivas en Student y varias en Director/Teacher/Parent.**

## What Happened

Se recorrieron los roles restantes navegando a sus dashboards y capturando hrefs del menú. Luego se navegó a las rutas para clasificar OK vs 404.

Teacher:
- OK: /teacher, /teacher/planning, /teacher/gradebook, /teacher/schedule, /teacher/students, /teacher/messages, /teacher/calendar
- 404 (en menú): /teacher/news, /teacher/settings

Parent:
- OK: /parent, /parent/finances, /parent/messages, /parent/calendar
- 404 (en menú): /parent/documents, /parent/news, /parent/settings

Student:
- OK: /student (dashboard)
- 404 (en menú): /student/class-prep, /student/attendance, /student/exams, /student/assignments, /student/schedule, /student/peers, /student/messages, /student/analytics, /student/reports, /student/news, /student/activities, /student/whats-new, /student/settings

Director:
- OK: /director, /director/overview, /director/activity, /director/announcements, /director/enrollment, /director/class-requests, /director/schedule-requests
- 404 (en menú): /director/academic, /director/financials, /director/resources, /director/accreditation, /director/staff

Esto confirma el problema principal: menús apuntan a superficies no implementadas, especialmente en Student (casi todo 404).

## Verification

Verificación manual en runtime con browser tools; asserts de '404' en rutas listadas como 404 y asserts de url_contains en rutas OK.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Browser navigation + asserts de texto '404' y url_contains en rutas de menú por rol` | 0 | ✅ pass | 0ms |


## Deviations

None.

## Known Issues

Algunas rutas Director tienen equivalentes en Admin; decidir si se corrige link a ruta existente o se crea placeholder por rol en S02.

## Files Created/Modified

- `app/src/app/teacher/**`
- `app/src/app/parent/**`
- `app/src/app/student/**`
- `app/src/app/director/**`


## Deviations
None.

## Known Issues
Algunas rutas Director tienen equivalentes en Admin; decidir si se corrige link a ruta existente o se crea placeholder por rol en S02.
