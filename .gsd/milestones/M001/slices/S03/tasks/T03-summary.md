---
id: T03
parent: S03
milestone: M001
provides:
  - Ruta de expediente individual `/admin/students/[studentId]`.
  - Navegación basada en pestañas para Datos Generales, Tutores e Inscripciones.
  - Interfaz y modal para crear y asociar un nuevo familiar/tutor al alumno activo.
  - Función de desvinculación rápida de tutores.
requires:
  - slice: S03
    provides: T01 (Backend de expediente y tutores) y T02 (Navegación al expediente desde la tabla).
affects: [S03]
key_files:
  - app/src/app/admin/students/[studentId]/page.tsx
key_decisions:
  - "Uso de pestañas locales (`activeTab`) sin cambiar la URL para hacer la experiencia más rápida y similar a una SPA (Single Page Application) dentro del panel de control."
  - "Los tutores no son globales desde la UI del admin todavía, se crean contextualmente 'dentro' del expediente de un alumno y se asocian de inmediato para simplificar el flujo cognitivo del usuario."
patterns_established:
  - "Manejo estricto de tipos en respuestas de errores (`'error' in res`) y diálogos de confirmación estándar nativos para acciones destructivas (`confirm()`)."
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T03-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-12T00:10:00Z
---

# T03: Pantalla de Expediente del Alumno (Tabs y Tutores)

**Vista detallada individual del estudiante con historial y gestión de núcleo familiar.**

## What Happened
Se completó el flujo de estudiantes creando la vista dedicada para el expediente en `/admin/students/[studentId]/page.tsx`. Esta interfaz consume la información completa del estudiante, y se divide en 3 pestañas principales: Información General, Tutores / Familia e Inscripciones.
En la pestaña de Tutores, el administrador puede revisar quiénes están a cargo del estudiante y cuenta con un Modal para agregar nuevos contactos familiares. Al guardar, el backend no solo crea al tutor sino que lo vincula instantáneamente al alumno en una sola transacción.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/app/admin/students/[studentId]/page.tsx` — Interfaz construida.