# S03: Teacher: Asistencia mínima (tomar asistencia + persistencia)

**Goal:** Habilitar la captura de asistencia en el flujo demo sin errores genéricos.
**Demo:** After this: Teacher entra a su clase y registra asistencia para una fecha; ve confirmación.

## Tasks
- [x] **T01: Creé /teacher/classes (listado) y validé navegación a detalle de clase seeded desde el menú teacher.** — - Implementar `app/src/app/teacher/classes/page.tsx` (listado) que consuma `getTeacherDashboardData()`.
- Mostrar cards/listado de clases con link a `/teacher/classes/[sectionSubjectId]`.
- Asegurar que el menú teacher ya apunta a una ruta existente.
- Smoke: teacher puede ver listado y entrar a detalle.

  - Estimate: 2-3h
  - Files: app/src/app/teacher/classes/page.tsx, app/src/actions/teacher.ts, app/src/lib/nav/menu.ts
  - Verify: Browser: login teacher -> /teacher/classes carga y lista clases; click abre detalle y no muestra error.
- [ ] **T02: Implementar UI mínima para tomar asistencia en detalle de clase** — - Localizar tab/acción de asistencia en `ClassDetailsTabs`.
- Si ya existe, verificar que guarda; si falta, agregar un bloque mínimo:
  - seleccionar fecha (hoy) y marcar status por alumno
  - llamar server action de attendance (en `actions/attendance.ts` o `actions/classes.ts` si aplica)
  - feedback de éxito/error
- Evitar 'Algo salió mal'; errores accionables.

  - Estimate: 3-5h
  - Files: app/src/app/teacher/classes/[sectionSubjectId]/ClassDetailsTabs.tsx, app/src/actions/attendance.ts, app/src/actions/classes.ts
  - Verify: Browser: teacher abre clase -> marca asistencia -> guardar -> recarga refleja cambios.
- [ ] **T03: Verificación DB + UAT de Teacher Attendance** — - Ejecutar seed.
- Login teacher.
- Ir a /teacher/classes, abrir clase, tomar asistencia.
- Verificar en DB: AttendanceSession creada y AttendanceRecord para alumnos.
- Escribir pasos UAT para slice.

  - Estimate: 45-90m
  - Files: .gsd/milestones/M008/slices/S03/**
  - Verify: Checklist UAT ejecutable + query prisma confirma persistencia.
