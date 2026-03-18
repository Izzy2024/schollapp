---
id: T02
parent: S03
milestone: M002
provides:
  - Hardening de acciones de asistencia con guardrails de autorización multi-tenant, validación de estado y trazabilidad de actor en sesión/evento.
key_files:
  - app/src/actions/attendance.ts
  - .gsd/milestones/M002/slices/S03/S03-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Centralizar validaciones de guardado en helpers reutilizables (`getAttendanceWriteContext`, `assertRoleCanWriteAttendance`, `assertTenantScope`, `assertTeacherOwnership`, `sanitizeStatus`) para que no exista camino de escritura sin guardrails.
patterns_established:
  - Error codes estables en capa de acción (`UNAUTHORIZED_SCOPE`, `TENANT_SCOPE_VIOLATION`, `INVALID_ATTENDANCE_STATUS`, `INVALID_ATTENDANCE_DATE`, `SECTION_NOT_FOUND`) antes de cualquier escritura.
observability_surfaces:
  - ActivityEvent.actorUserId
  - ActivityEvent.metadata (mode, sectionSubjectId/sectionId, dateIso, recordCount, breakdown de statuses)
  - AttendanceSession.takenById
  - Comando de verificación: `cd app && npm test -- src/actions/__tests__/attendance.authorization.test.ts src/actions/__tests__/attendance.persistence.test.ts src/actions/__tests__/attendance.reporting.test.ts`
duration: 35m
verification_result: partial
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Endurecer actions de asistencia (autorización por alcance + validación de estado + trazabilidad actor)

**Se endureció `attendance.ts` con autorización explícita por alcance/rol, validación estricta de estados y trazabilidad de actor en sesión/eventos, dejando el runtime alineado al contrato de S03.**

## What Happened

Se implementó el hardening de negocio en `app/src/actions/attendance.ts`:

- Se agregó catálogo estricto de estados permitidos (`present|absent|late|excused`) y validación previa a persistencia con error estable `INVALID_ATTENDANCE_STATUS`.
- Se introdujo guard reutilizable para escritura de asistencia:
  - `getAttendanceWriteContext` obtiene identidad+tenant del usuario autenticado.
  - `assertRoleCanWriteAttendance` restringe escritura a `admin`/`teacher`.
  - `assertTenantScope` bloquea cruce de tenant con `TENANT_SCOPE_VIOLATION`.
  - `assertTeacherOwnership` valida ownership docente↔`sectionSubjectId` con `UNAUTHORIZED_SCOPE`.
- Se normalizó fecha con validación (`INVALID_ATTENDANCE_DATE`) para robustez.
- Se ajustó `saveAttendanceSession` para:
  - aplicar guardrails antes de transacción,
  - persistir `takenById` en create/update de `AttendanceSession`,
  - registrar `ActivityEvent.actorUserId` y metadata estructurada de auditoría.
- Se endureció también `saveAttendanceBySectionDate` con mismos guardrails multi-tenant, validación de estados y trazabilidad (`takenById` + `actorUserId`).
- Se añadió `bySection` en `getStudentAttendanceSummary` para cubrir agregado por grupo esperado por contratos de reporte.

## Verification

Ejecutado:

- `cd app && npm test -- src/actions/__tests__/attendance.authorization.test.ts src/actions/__tests__/attendance.persistence.test.ts src/actions/__tests__/attendance.reporting.test.ts`

Resultado:

- ❌ No se pudo validar en runner actual por falla de infraestructura heredada de T01/T02:
  - `TypeError: mock.module is not a function`
  - Impacta suites de asistencia y también pruebas preexistentes fuera de alcance (`enrollment`).
- ✅ Verificación por inspección de código: no hay camino de escritura en `saveAttendanceSession`/`saveAttendanceBySectionDate` que evite guard de rol+tenant+ownership (cuando aplica), ni persistencia de estados fuera de catálogo.

## Diagnostics

Para inspección futura rápida:

1. Revisar `app/src/actions/attendance.ts`:
   - helpers de guardrails y validación de estados;
   - payload de `ActivityEvent` con `actorUserId` y metadata estructurada;
   - upsert de `AttendanceSession` con `takenById` en create/update.
2. Re-ejecutar suite de contrato de S03 cuando se habilite soporte de mocking de módulos en runner:
   - `cd app && npm test -- src/actions/__tests__/attendance.authorization.test.ts src/actions/__tests__/attendance.persistence.test.ts src/actions/__tests__/attendance.reporting.test.ts`
3. Señales esperadas de rechazo estable:
   - `UNAUTHORIZED_SCOPE`
   - `TENANT_SCOPE_VIOLATION`
   - `INVALID_ATTENDANCE_STATUS`

## Deviations

- Se endureció también `saveAttendanceBySectionDate` (flujo admin por `sectionId`) además del mínimo de `saveAttendanceSession`, para evitar huecos de escritura sin guardrails.
- Se incorporó `bySection` en `getStudentAttendanceSummary` para mantener consistencia con contrato de reporte definido en pruebas.

## Known Issues

- El comando de verificación de slice sigue bloqueado por infraestructura de test runner (`mock.module`) no disponible en ejecución actual con `tsx --test` + entorno Node en repo.
- Esto impide cerrar “todo verde” en T02 aun cuando el runtime quedó endurecido.

## Files Created/Modified

- `app/src/actions/attendance.ts` — hardening completo: autorización por alcance, validación de estados, trazabilidad (`takenById`, `actorUserId`, metadata), agregado `bySection`.
- `.gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md` — resumen de ejecución, verificación parcial y diagnóstico de bloqueo de runner.
