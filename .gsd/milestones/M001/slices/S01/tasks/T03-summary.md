---
id: T03
parent: S01
milestone: M001
provides:
  - Eliminación de la dependencia del string hardcodeado `'school-demo'` en el backend (Server Actions).
  - Integración transparente de `auth()` en Server Actions para asegurar el `tenantSlug`.
requires:
  - slice: S01
    provides: T02 completado con la inyección de `tenantSlug` en la sesión de Auth.js.
affects: [S01]
key_files:
  - app/src/actions/*.ts
key_decisions:
  - "En vez de refactorizar decenas de componentes cliente y firmas de funciones que romperían la app, se modificaron los Server Actions para reescribir `tenantSlug` usando `session.user.tenantSlug`."
  - "Esto aisla el tenant de forma segura a nivel de servidor (nadie puede suplantar otro tenant desde el frontend)."
patterns_established:
  - "Los Server Actions ahora comienzan con `const session = await auth(); tenantSlug = session.user.tenantSlug;` validando y extrayendo de la sesión antes de cualquier operación a base de datos."
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T03-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:20:00Z
---

# T03: Refactorización de Multi-Tenant (Eliminar hardcodes)

**Integración de la sesión autenticada en todos los Server Actions para proteger el Multi-Tenant de forma segura.**

## What Happened

Se revisó el uso global del string estático `'school-demo'`. En lugar de hacer una refactorización masiva en el frontend (lo cual implicaba cambiar todas las llamadas a Server Actions desde Client Components), se implementó un patrón seguro a nivel de capa API/Actions.
A través de un script automatizado y correcciones manuales para colisiones de nombres (`session` vs `attendanceSession`), se inyectó `auth()` en la cabecera de las 16 funciones clave en `app/src/actions/*.ts`.
De este modo, aunque el frontend envíe `'school-demo'`, el backend ahora lo sobreescribe obligatoriamente con el valor real proveniente del token JWT (Auth.js session), logrando un aislamiento estricto y seguro por tenant sin romper la interfaz de usuario existente.

## Deviations
Se evitó la refactorización profunda de componentes en el frontend priorizando la seguridad en el backend, minimizando el impacto superficial pero maximizando la seguridad del Multi-Tenant (MVP-friendly).

## Files Created/Modified
- `app/src/actions/admin.ts`, `attendance.ts`, `classes.ts`, `classRequests.ts`, `directorStats.ts`, `enrollment.ts`, `gradebook.ts`, `parent.ts`, `planning.ts`, `schedule.ts`, `scheduleRequests.ts`, `student.ts`, `students.ts`, `subjects.ts`, `teacher.ts`, `adminClasses.ts` (16 archivos modificados para inyectar `auth()`).