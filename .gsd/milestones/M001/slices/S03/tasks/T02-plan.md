# T02: UI de Listado y Creación Rápida de Alumnos

**Slice:** S03
**Milestone:** M001

## Goal
Adaptar la interfaz de la página `/admin/students` para mostrar el listado real de alumnos consumiendo el server action `getStudents` y permitir la creación rápida de un alumno desde un modal.

## Must-Haves

### Truths
- "Un admin navega a `/admin/students` y ve la lista de estudiantes paginada y filtrable."
- "El admin puede dar clic en 'Nuevo Alumno', rellenar Nombres y Apellidos, y guardarlo."
- "Cada fila de la tabla tiene un link al expediente detallado del alumno (`/admin/students/[id]`)."

### Artifacts
- `app/src/app/admin/students/page.tsx` — Actualizado con la lógica real de estado y el Modal de creación.

### Key Links
- `/admin/students` llama a `getStudents()` y `createStudent()` (de `actions/students.ts`).

## Steps
1. Revisar `app/src/app/admin/students/page.tsx` para ver cómo está (ahora mismo debería estar usando datos falsos o estáticos).
2. Insertar `useEffect` para llamar `getStudents()`.
3. Crear el estado y formulario para `createStudent` Modal (Nombre, Apellidos obligatorios; Email, Teléfono, Matrícula opcionales).
4. Hacer que las filas sean clickeables o agregar un botón "Ver Expediente" que enrute hacia `/admin/students/[id]`.
5. Ejecutar la compilación de TS.
6. Actualizar `.gsd/STATE.md`.