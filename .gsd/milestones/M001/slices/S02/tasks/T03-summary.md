---
id: T03
parent: S02
milestone: M001
provides:
  - CRUD para `Section` (Grupos) a través de Server Actions (`getSections`, `createSection`, `deleteSection`).
  - Interfaz de usuario integrada en `/admin/academic` para gestionar los grupos asociando Ciclos y Grados.
  - Validación cruzada que impide la eliminación de Grupos si ya tienen alumnos inscritos.
requires:
  - slice: S02
    provides: T01 y T02 (Estructura base de la vista académica).
affects: [S02]
key_files:
  - app/src/actions/academic.ts
  - app/src/app/admin/academic/page.tsx
key_decisions:
  - "Los grupos se asocian obligatoriamente a un Ciclo y un Grado al momento de su creación desde un modal integrado en la misma pantalla."
  - "La eliminación de una sección se bloquea preventivamente desde la UI si el backend detecta inscripciones activas (protección de integridad de datos)."
patterns_established:
  - "Uso de `_count` en Prisma para obtener métricas rápidas de relaciones (ej. cantidad de inscripciones) sin necesidad de hacer fetch completo."
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T03-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:40:00Z
---

# T03: API y UI para Grupos (Sections)

**Implementación final del CRUD para Grupos (Secciones) completando el flujo de configuración académica.**

## What Happened
Se expandió `app/src/actions/academic.ts` para incluir las operaciones `getSections`, `createSection` y `deleteSection`, asegurando la inyección de `tenantSlug` desde la sesión. El listado de secciones extrae de forma optimizada la cantidad de inscripciones (`enrollments`) que tiene cada una mediante la cláusula `_count` de Prisma.
Posteriormente, se actualizó la interfaz de `/admin/academic/page.tsx` para mostrar una nueva tabla debajo de los ciclos y grados. Desde allí, el administrador puede abrir un modal para crear una nueva sección (ej. Grupo A) asignándole su ciclo, grado y capacidad. Si una sección ya cuenta con alumnos inscritos, su botón de eliminación se deshabilita para prevenir inconsistencias en la base de datos.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/actions/academic.ts` — Añadidas las acciones del CRUD para Sections.
- `app/src/app/admin/academic/page.tsx` — Insertadas tabla y modal correspondientes a las secciones.