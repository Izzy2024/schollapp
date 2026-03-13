# T03: API y UI para Grupos (Sections)

**Slice:** S02
**Milestone:** M001

## Goal
Permitir a los administradores crear, listar y eliminar Grupos (Sections) asociados a un Año Académico y un Grado.

## Must-Haves

### Truths
- "Un admin puede ver las secciones (ej. A, B) creadas para un ciclo y grado específico."
- "Un admin puede crear una nueva sección indicando nombre (ej. 'A') y cupo máximo."
- "Las secciones pueden ser eliminadas si no tienen estudiantes inscritos."

### Artifacts
- `app/src/actions/academic.ts` actualizado con `getSections`, `createSection`, `deleteSection`.
- `app/src/app/admin/academic/page.tsx` actualizado para incluir una nueva columna o bloque dedicado a las Secciones.

### Key Links
- `/admin/academic` invoca `getSections()` filtrando opcionalmente por el ciclo escolar activo.

## Steps
1. Actualizar `app/src/actions/academic.ts` añadiendo funciones para el CRUD de `Section`.
2. Incluir `capacity` en el modal de creación de sección, ya que `Section` lo soporta en Prisma.
3. Actualizar la UI en `page.tsx` para mostrar una lista de secciones, probablemente con un selector o agrupadas por Grado.
4. Conectar el formulario de creación de sección.
5. Ejecutar TS checks.
6. Actualizar `.gsd/STATE.md`.