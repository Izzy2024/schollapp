---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T01: Crear /teacher/classes (listado) y navegación a detalles seeded

- Implementar `app/src/app/teacher/classes/page.tsx` (listado) que consuma `getTeacherDashboardData()`.
- Mostrar cards/listado de clases con link a `/teacher/classes/[sectionSubjectId]`.
- Asegurar que el menú teacher ya apunta a una ruta existente.
- Smoke: teacher puede ver listado y entrar a detalle.

## Inputs

- `app/src/actions/teacher.ts`
- `app/src/app/teacher/page.tsx`
- `app/src/app/teacher/classes/[sectionSubjectId]/page.tsx`

## Expected Output

- `Ruta /teacher/classes existe y lista clases`
- `Links a detail funcionan`

## Verification

Browser: login teacher -> /teacher/classes carga y lista clases; click abre detalle y no muestra error.
