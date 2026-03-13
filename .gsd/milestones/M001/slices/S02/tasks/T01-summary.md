---
id: T01
parent: S02
milestone: M001
provides:
  - CRUD para `AcademicYear` con Server Actions protegidos por Auth.js.
  - CRUD para `GradeLevel` con Server Actions protegidos por Auth.js.
requires:
  - slice: S01
    provides: "Patrón seguro de `auth()` para extracción de `tenantSlug`"
affects: [S02]
key_files:
  - app/src/actions/academic.ts
key_decisions:
  - "Validación básica de solapamiento de fechas para los ciclos escolares."
  - "El primer ciclo escolar creado en el tenant se marca automáticamente como 'activo'."
  - "Validación preventiva al borrar un `GradeLevel`: se rechaza si ya tiene secciones vinculadas para evitar errores de llave foránea ocultos."
patterns_established:
  - "Inyección de tenantSlug vía `const session = await auth();` asegurada en todo el módulo."
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:30:00Z
---

# T01: API / Server Actions para Ciclos y Grados

**Implementación de la capa lógica y conectividad con base de datos para la configuración académica.**

## What Happened
Se creó el archivo `app/src/actions/academic.ts` agrupando todas las operaciones CRUD (Server Actions) requeridas para gestionar Años Académicos (`AcademicYear`) y Grados (`GradeLevel`). 
Cada función incorpora el patrón de seguridad derivado de S01 donde el `tenantSlug` se valida desde el token JWT. Se agregaron validaciones de negocio críticas: no permitir crear ciclos con fechas traslapadas o inconsistentes, y no permitir borrar grados que ya posean grupos (Sections) activos. 

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/actions/academic.ts` — Creado y tipado correctamente para consumo desde cliente.