---
id: S02
parent: M001
provides:
  - Sistema de configuración académica completa desde la interfaz de administrador.
  - CRUD para Ciclos Escolares (`AcademicYear`), permitiendo definir inicio, fin y estado activo.
  - CRUD para Grados (`GradeLevel`) ordenables.
  - CRUD para Grupos/Secciones (`Section`) asociables a un Grado y un Ciclo.
requires:
  - slice: S01
    provides: Inyección de `tenantSlug` desde la sesión autenticada.
key_files:
  - app/src/actions/academic.ts
  - app/src/app/admin/academic/page.tsx
key_decisions:
  - "La pantalla de configuración académica concentra en una sola vista los 3 elementos clave (Ciclos, Grados, Secciones) para que el administrador pueda armar la estructura de la escuela rápidamente sin tener que navegar entre muchas páginas."
  - "Se bloquean las eliminaciones en cascada peligrosas desde la capa de servicio y UI (no se puede borrar un grado si tiene secciones, no se puede borrar una sección si tiene alumnos)."
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-summary.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-summary.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-summary.md
completed_at: 2026-03-11T23:45:00Z
---

# S02: Configuración Académica (CRUD)

**Módulo de configuración inicial para que la escuela pueda dar de alta sus ciclos, grados y grupos previo a la inscripción de estudiantes.**

## What Happened
Se desarrolló la vista `/admin/academic` y todo su backend en `actions/academic.ts`. El administrador ahora tiene un panel de control con soporte multi-tenant donde puede crear los ciclos escolares (ej. 2026-2027), dar de alta los grados (ej. 1° Primaria) y finalmente crear grupos específicos (Secciones) cruzando la información de Grado y Ciclo (ej. 1° Primaria - Grupo A).
Todas las rutas y actions están aseguradas por la sesión de Auth.js creada en S01.
Las tablas muestran información enriquecida (ej. número de alumnos inscritos en una sección) y proveen retroalimentación visual sobre las acciones permitidas y denegadas, previniendo así errores de consistencia de datos por eliminaciones indebidas.