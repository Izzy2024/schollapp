---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T01: UI mínima de inscripciones: listado + inscripción rápida

- Reemplazar `app/src/app/admin/enrollment/page.tsx` placeholder por UI mínima.
- Mostrar tabla de inscripciones (getEnrollments) + status.
- Agregar flujo mínimo: seleccionar student + section y ejecutar enrollStudent.
- Mostrar feedback (success/error) con códigos dominio cuando aplique.
- Evitar server-only imports en client: usar server actions como boundary.

## Inputs

- `.gsd/milestones/M008/slices/S01/tasks/T01-SUMMARY.md`
- `.gsd/milestones/M008/slices/S01/tasks/T02-SUMMARY.md`
- `app/src/actions/enrollment-impl.ts`
- `app/prisma/seed.ts`

## Expected Output

- `UI enrollment funcional con listado + inscripción rápida`

## Verification

Browser: admin → /admin/enrollment no muestra 'En construcción'. Crear inscripción y ver que aparece en listado.
