---
id: T02
parent: S03
milestone: M001
provides:
  - Interfaz unificada en `/admin/students` para listar y buscar alumnos del tenant activo.
  - Formulario Modal dentro de la vista para dar de alta alumnos rápidamente (creación del objeto `Student`).
  - Navegación al expediente detallado del alumno haciendo clic en el icono "Ver Expediente" de la tabla.
requires:
  - slice: S03
    provides: T01 (Backend Server Actions para obtener y crear alumnos).
affects: [S03]
key_files:
  - app/src/app/admin/students/page.tsx
key_decisions:
  - "El listado de alumnos incluye un buscador con debounce (300ms) para mejorar la usabilidad sin sobrecargar el servidor."
  - "El modal de creación no requiere un código de estudiante (matrícula); si se deja vacío, el backend (T01) lo auto-generará siguiendo el patrón `STD-XXX`."
patterns_established:
  - "Se enruta al expediente individual mediante `window.location.href = '/admin/students/[id]'` a la espera de construir el componente de página de la siguiente tarea."
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T02-plan.md
duration: 10min
verification_result: pass
completed_at: 2026-03-12T00:00:00Z
---

# T02: UI de Listado y Creación Rápida de Alumnos

**Adaptación de la vista principal del módulo de alumnos para integrar la creación y la consulta hacia el backend.**

## What Happened
Se revisó y modificó el componente `app/src/app/admin/students/page.tsx`. Anteriormente tenía una tabla, pero ahora la hemos conectado de forma sólida a las llamadas asíncronas de `getStudents()` y `createStudent()`. La tabla expone información agregada importante como la Asistencia del último mes y el Grado/Sección donde se encuentra inscrito el alumno.
Adicionalmente, se activó la redirección al hacer click en el botón del "Ojo" (Ver Expediente), el cual llevará a la vista que construiremos en T03 (`/admin/students/[studentId]`).

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/app/admin/students/page.tsx` — Actualizado con carga dinámica, manejo de estado para el paginador y botón para enrutar a expediente.