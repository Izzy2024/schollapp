---
id: S03
parent: M001
provides:
  - CRUD completo para estudiantes y tutores (Admin Dashboard).
  - Paginación y filtrado real en la tabla de alumnos.
  - Generación automática de Matrícula (ej. STD-001) para nuevos alumnos si el admin no proporciona una.
  - Vista de Expediente Detallado (Tabs: Info General, Tutores, Historial).
  - Lógica relacional bidireccional atómica al agregar o remover tutores de un alumno.
requires:
  - slice: S01
    provides: Inyección de `tenantSlug` desde la sesión autenticada.
  - slice: S02
    provides: Modelos de configuración académica para el despliegue de inscripciones en el expediente.
key_files:
  - app/src/actions/students.ts
  - app/src/actions/guardians.ts
  - app/src/app/admin/students/page.tsx
  - app/src/app/admin/students/[studentId]/page.tsx
key_decisions:
  - "El flujo principal de creación de Tutores sucede de forma anidada al expediente del Alumno, priorizando la facilidad de captura de un núcleo familiar completo sin tener que saltar entre diferentes ventanas del dashboard."
  - "Se usó Tailwind de forma exhaustiva para construir Modales y Pestañas locales (`Client Components` de React) para que la experiencia sea fluida e inmediata."
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-summary.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-summary.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-summary.md
completed_at: 2026-03-12T00:15:00Z
---

# S03: Gestión de Expedientes (Alumnos y Tutores)

**Cierre de las fundaciones operativas de la escuela permitiendo registrar a las personas que utilizarán la plataforma.**

## What Happened
Se completó todo el módulo de Expedientes para la administración. En el backend, las acciones de base de datos fueron reescritas para incluir soporte seguro multi-tenant y se agregó soporte transaccional para la relación Padre-Alumno (Guardian-Student).

En el front-end:
1. La tabla principal de **Estudiantes** se conectó a la BD real, soportando filtros, buscadores (con retraso anti-spam/debounce) y paginación.
2. Desde la tabla se puede lanzar un **Modal** para registrar nuevos alumnos al vuelo, generando sus matrículas si no son dadas.
3. Se añadió la ruta `/admin/students/[studentId]` (El Expediente), una vista a profundidad donde el Director/Admin puede revisar datos, ver en qué años escolares está/estuvo el alumno y añadir a los padres de familia para contacto.