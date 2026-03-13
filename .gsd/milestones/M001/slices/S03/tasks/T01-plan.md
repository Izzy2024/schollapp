# T01: API / Server Actions para Estudiantes y Tutores

**Slice:** S03
**Milestone:** M001

## Goal
Desarrollar y blindar los Server Actions requeridos para crear y consultar expedientes de estudiantes, así como de sus tutores (Guardian).

## Must-Haves

### Truths
- "Un admin puede consultar la lista paginada de estudiantes."
- "Se pueden crear nuevos estudiantes, validando que el código de estudiante (matrícula) no esté duplicado en el mismo tenant."
- "Se puede registrar un Tutor (`Guardian`) y vincularlo a un estudiante a través del modelo `StudentGuardian`."

### Artifacts
- `app/src/actions/students.ts` — Expandido con funciones de CRUD sólidas.
- `app/src/actions/guardians.ts` — Creado para manejar Tutores y vinculaciones.

### Key Links
- Las funciones deben usar `const session = await auth();` para asegurar `tenantSlug`.

## Steps
1. Revisar `app/src/actions/students.ts` actual y refinar `createStudent` y `getStudents`.
2. Añadir `getStudentById(studentId)` para traer los detalles completos, incluyendo las relaciones con `StudentGuardian`, `Enrollment` y `AttendanceRecord`.
3. Crear archivo `app/src/actions/guardians.ts`.
4. Añadir lógica para `createGuardianAndLink(studentId, data)` que inserta un tutor y la fila pivot `StudentGuardian` de manera transaccional.
5. Añadir lógica para `getGuardiansByStudent(studentId)`.
6. Actualizar `.gsd/STATE.md`.