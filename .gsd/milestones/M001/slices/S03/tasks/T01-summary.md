---
id: T01
parent: S03
milestone: M001
provides:
  - Función `getStudentById` añadida en `actions/students.ts` para obtener todo el detalle de un estudiante.
  - Archivo `actions/guardians.ts` creado con funciones `createGuardianAndLink` y `removeGuardianLink`.
requires:
  - slice: S01
    provides: Patrón seguro de `auth()` para extracción de `tenantSlug` (utilizado en estos nuevos Server Actions).
affects: [S03]
key_files:
  - app/src/actions/students.ts
  - app/src/actions/guardians.ts
key_decisions:
  - "La creación de tutores (`Guardian`) y su vínculo (`StudentGuardian`) se manejan en una sola transacción (`$transaction`) para evitar dejar registros huérfanos o inconsistencias."
patterns_established:
  - "Todos los Server Actions utilizan `const session = await auth(); tenantSlug = session.user.tenantSlug;` validando siempre contra el JWT actual."
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-plan.md
duration: 10min
verification_result: pass
completed_at: 2026-03-11T23:55:00Z
---

# T01: API / Server Actions para Estudiantes y Tutores

**Backend extendido para cargar detalles completos de un estudiante y gestionar el CRUD de sus padres o tutores.**

## What Happened
Se completó la capa de backend para permitir acceder al "Expediente" del estudiante.
1. Se extendió `actions/students.ts` con la función `getStudentById` que incluye las relaciones a los tutores y el historial de inscripciones.
2. Se creó un nuevo archivo `actions/guardians.ts` que implementa transaccionalmente la creación de un `Guardian` (Padre/Tutor) y su relación inmediata `StudentGuardian` con el alumno seleccionado, garantizando atomicidad. También se implementó la función para desvincular un tutor.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/actions/students.ts` — Agregado `getStudentById`.
- `app/src/actions/guardians.ts` — Creado nuevo con lógica de tutores.