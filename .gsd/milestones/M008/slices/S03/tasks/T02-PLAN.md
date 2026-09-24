---
estimated_steps: 6
estimated_files: 3
skills_used: []
---

# T02: Implementar UI mínima para tomar asistencia en detalle de clase

- Localizar tab/acción de asistencia en `ClassDetailsTabs`.
- Si ya existe, verificar que guarda; si falta, agregar un bloque mínimo:
  - seleccionar fecha (hoy) y marcar status por alumno
  - llamar server action de attendance (en `actions/attendance.ts` o `actions/classes.ts` si aplica)
  - feedback de éxito/error
- Evitar 'Algo salió mal'; errores accionables.

## Inputs

- `app/src/actions/attendance.ts`
- `app/src/app/teacher/classes/[sectionSubjectId]/ClassDetailsTabs.tsx`

## Expected Output

- `Asistencia se puede registrar desde UI y persiste`

## Verification

Browser: teacher abre clase -> marca asistencia -> guardar -> recarga refleja cambios.
