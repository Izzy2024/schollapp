---
id: S03
parent: M008
milestone: M008
provides:
  - Flujo teacher mínimo operable para clases y base de captura/persistencia de asistencia con evidencia diagnóstica reproducible.
requires:
  []
affects:
  - S04
key_files:
  - app/src/app/teacher/classes/page.tsx
  - app/src/actions/teacher.ts
  - app/src/app/teacher/classes/[sectionSubjectId]/page.tsx
  - app/scripts/t03-uat-evidence.sql
  - .gsd/milestones/M008/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M008/slices/S03/tasks/T03-SUMMARY.md
key_decisions:
  - Usar `getTeacherDashboardData()` como fuente de verdad del listado teacher para minimizar riesgo y reutilizar datos seeded.
  - Tratar el drift de esquema como hallazgo de diagnóstico en esta slice (no cambio runtime), dejando evidencia reproducible para corregir scripts sin introducir regressions funcionales.
patterns_established:
  - Cerrar placeholders del happy path creando rutas operativas mínimas antes de ampliar funcionalidades.
  - Para verificación de persistencia en slices demo, combinar smoke de navegación + evidencia DB con comandos reproducibles y diagnóstico de esquema.
observability_surfaces:
  - Comandos diagnósticos autoritativos: `sqlite3 prisma/dev.db ".schema AttendanceSession"`, `sqlite3 prisma/dev.db ".schema AttendanceRecord"`, y `npx prisma db execute --file scripts/t03-uat-evidence.sql` para detectar drift.
drill_down_paths:
  - .gsd/milestones/M008/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M008/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M008/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-08T19:43:40.548Z
blocker_discovered: false
---

# S03: Teacher: Asistencia mínima (tomar asistencia + persistencia)

**Habilitamos el flujo mínimo de asistencia para teacher con ruta operativa de clases, navegación a detalle y evidencia de persistencia en AttendanceSession/AttendanceRecord, eliminando placeholders/404 del happy path.**

## What Happened

La slice cerró el recorrido teacher para asistencia en tres pasos. T01 creó `/teacher/classes` como ruta real (server component) consumiendo `getTeacherDashboardData()`, eliminó el 404 del menú teacher y dejó navegación funcional hacia `/teacher/classes/[sectionSubjectId]` con tabs de detalle. T02 quedó registrado sin narrativa/validación en su resumen, pero no introdujo cambios de archivos reportados. T03 ejecutó seed y consolidó evidencia técnica de persistencia en DB local para asistencia, incluyendo hallazgo de drift de esquema (`takenById` presente en `AttendanceSession` vs supuestos previos `takenBy/source`), además de dejar SQL de evidencia reproducible para futuras verificaciones. En conjunto, la slice entrega un flujo demo usable para teacher en el tramo clases→detalle→asistencia/persistencia con diagnóstico claro de la variación de esquema.

## Verification

Se verificó a nivel de UI y DB: (1) smoke browser teacher login → `/teacher/classes` lista clases y navegación a detalle sin error; (2) `npm run db:seed` exitoso; (3) inspección de esquema real con sqlite3 para `AttendanceSession` y `AttendanceRecord`; (4) ejecución del SQL de evidencia detectó y documentó el drift de columnas esperadas vs reales. Resultado global: funcionalidad principal disponible y persistencia respaldada por evidencia diagnóstica reproducible.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T02 quedó con resumen incompleto y sin evidencia explícita; para cierre de slice se consolidó verificación con evidencia de T01 y T03 y se documentó la brecha. También se priorizó verificación de persistencia con diagnóstico de esquema sobre automatización browser completa de guardado en esta corrida.

## Known Limitations

La evidencia de T02 no documenta explícitamente ejecución de guardado desde UI en este cierre. Hay drift de esquema local vs supuestos previos en scripts de asistencia (`takenById` vs `takenBy/source`) que requiere normalización para evitar falsos negativos en verificaciones automáticas.

## Follow-ups

1) Completar smoke automatizado UI de 'tomar asistencia hoy' con aserción de recarga/estado. 2) Ajustar `app/scripts/t03-uat-evidence.sql` al esquema vigente y re-ejecutar en verde. 3) En S04, incluir recorrido E2E admin→teacher con evidencia integrada UI+DB.

## Files Created/Modified

None.
