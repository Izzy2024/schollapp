---
id: T02
parent: S02
milestone: M001
provides:
  - Interfaz de administración (`/admin/academic`) para visualizar y crear Ciclos Escolares (`AcademicYear`).
  - Interfaz para visualizar, crear y eliminar Grados (`GradeLevel`).
  - Capacidad de marcar un ciclo escolar como activo directamente desde la UI.
requires:
  - slice: S02
    provides: T01 con las funciones del backend listas (Server Actions).
affects: [S02]
key_files:
  - app/src/app/admin/academic/page.tsx
key_decisions:
  - "El menú de navegación en `page.tsx` se mantuvo estático replicando el estilo de otras páginas admin en el MVP. Se agregó el ítem 'Académico' bajo la sección de Configuración."
  - "Los modales de creación se implementaron usando un overlay de Tailwind CSS nativo para mantener consistencia con el look and feel del resto del dashboard."
patterns_established:
  - "Los errores de los Server Actions (que retornan un objeto `{ error: string }`) se capturan mediante la verificación `'error' in res` para satisfacer TypeScript sin tener que recurrir a casteo de errores inseguro."
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T02-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:35:00Z
---

# T02: UI de Configuración de Ciclos y Grados

**Creación de la interfaz gráfica para gestionar años académicos y grados.**

## What Happened
Se construyó la página principal de "Configuración Académica" bajo la ruta `/admin/academic`. Esta interfaz se dividió en dos columnas: una para listar los ciclos escolares y otra para los grados. 

Se integraron botones para desplegar modales limpios que permiten crear nuevos registros. Al guardar, el Client Component consume directamente los Server Actions desarrollados en la Tarea T01 y actualiza la vista mediante `loadData()`. Se añadió la validación necesaria de TypeScript para manejar respuestas de error de las acciones (`'error' in res`).

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/app/admin/academic/page.tsx` — Creado con layout y listados CRUD.