# S03: Control de Asistencia

**Goal:** Cerrar S03 con control de asistencia diario robusto (admin y docente) con autorización por alcance, trazabilidad de actor y reportes básicos confiables por grupo y alumno.
**Demo:** Un admin/control escolar y un docente asignado pueden pasar lista por fecha/grupo, guardar de forma idempotente estados válidos (`present|absent|late|excused`), recargar y ver resultados persistidos; además existen señales de auditoría (`takenById`, `actorUserId`) y reporte básico verificable por grupo/alumno.

## Must-Haves

- Endurecer autorización de asistencia por rol y alcance tenant (incluyendo validación de asignación docente ↔ `sectionSubjectId`).
- Validar estrictamente estados de asistencia permitidos antes de persistir.
- Persistir trazabilidad de actor al guardar asistencia (`AttendanceSession.takenById` y `ActivityEvent.actorUserId`).
- Mantener idempotencia por fecha/sección/alumno al re-guardar lista.
- Verificar reportes básicos de asistencia por grupo y por alumno (R005) con datos reales de runtime.
- Verificar superficie de diagnóstico/auditoría para fallas de autorización/estado inválido (R006 soporte a S05).

## Proof Level

- This slice proves: operational
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `app/src/actions/__tests__/attendance.authorization.test.ts` (nuevo): rechaza acceso fuera de alcance (rol no autorizado, docente no asignado, tenant cruzado).
- `app/src/actions/__tests__/attendance.persistence.test.ts` (nuevo): valida estados permitidos, idempotencia de upsert y persistencia de `takenById`.
- `app/src/actions/__tests__/attendance.reporting.test.ts` (nuevo): confirma agregados básicos por alumno/grupo con dataset de prueba.
- `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts`
- Verificación diagnóstica: en caso de rechazo/estado inválido, las acciones retornan error estable y existe evento/estado consultable para localizar causa sin inspección manual difusa.

## Observability / Diagnostics

- Runtime signals: `ActivityEvent` de asistencia incluye `actorUserId`, `entityType`, `entityId`, `action`, `metadata` estructurada (fecha/sección/conteos).
- Inspection surfaces: tablas `AttendanceSession`, `AttendanceRecord`, `ActivityEvent`; salidas estructuradas de server actions (`success`, `error`) y UI de asistencia (`message` / estado cargado).
- Failure visibility: errores estables para `UNAUTHORIZED_SCOPE` y `INVALID_ATTENDANCE_STATUS` (o equivalente consistente) con contexto mínimo no sensible para depuración.
- Redaction constraints: no registrar datos sensibles de sesión/credenciales; solo IDs y conteos necesarios de auditoría.

## Integration Closure

- Upstream surfaces consumed: `Enrollment` (S02), `SectionSubject`/asignaciones docentes, sesión auth multi-tenant de M001, UI `/admin/attendance` y `AttendanceDrawer`.
- New wiring introduced in this slice: guards de autorización en `app/src/actions/attendance.ts`, trazabilidad completa al persistir sesión/evento, y alineación de UI/acciones para mostrar fallas de validación/alcance de forma determinística.
- What remains before the milestone is truly usable end-to-end: S04 (comunicados) y S05 (bitácora global/dashboard). Para asistencia, esta slice deja flujo operativo base cerrado.

## Tasks

- [x] **T01: Crear suite de pruebas de asistencia (falla inicial) para autorización, persistencia y reportes** `est:1h`
  - Why: Define el contrato ejecutable de cierre S03 antes de ajustar implementación, evitando regresiones silenciosas.
  - Files: `app/src/actions/__tests__/attendance.authorization.test.ts`, `app/src/actions/__tests__/attendance.persistence.test.ts`, `app/src/actions/__tests__/attendance.reporting.test.ts`, `app/src/actions/attendance.ts`
  - Do: Crear pruebas con fixtures multi-tenant y casos de rol/alignment docente, estado inválido y re-guardado idempotente; incluir aserciones explícitas de `takenById`/`actorUserId` esperados; confirmar que inicialmente fallan contra brechas actuales.
  - Verify: `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts` (debe fallar al inicio con errores alineados a brechas detectadas).
  - Done when: Existe suite reproducible que captura contrato S03 y evidencia al menos una falla real previa al fix.

- [x] **T02: Endurecer actions de asistencia (autorización por alcance + validación de estado + trazabilidad actor)** `est:1h 30m`
  - Why: Cierra riesgos principales de seguridad y calidad de datos, y habilita bitácora útil para S05.
  - Files: `app/src/actions/attendance.ts`, `app/src/lib/auth/*` (si aplica helper existente), `app/prisma/schema.prisma` (solo si ajuste menor de compatibilidad de tipos es requerido)
  - Do: Implementar guards explícitos por rol/alcance tenant para admin/docente asignado; validar enum de estado permitido antes de upsert; persistir `AttendanceSession.takenById` y `ActivityEvent.actorUserId`; estandarizar respuesta de error diagnóstica sin exponer secretos.
  - Verify: Correr suite de T01 hasta verde; ejecutar caso negativo de autorización/estado inválido y confirmar error estable + ausencia de escritura inválida.
  - Done when: Todas las pruebas de contrato pasan y los guardrails bloquean accesos/estados fuera de política con trazabilidad consistente.

- [x] **T03: Alinear UI y cerrar verificación operativa admin/docente con reportes básicos** `est:1h`
  - Why: Garantiza progreso visible de producto (no solo backend) y prueba comportamiento real del flujo diario.
  - Files: `app/src/app/admin/attendance/page.tsx`, `app/src/components/AttendanceDrawer.tsx`, `app/src/actions/attendance.ts` (ajustes de wiring), `app/src/actions/__tests__/attendance.reporting.test.ts`
  - Do: Conectar manejo de errores/estados en UI para respuestas endurecidas; asegurar que guardado/recarga refleja conteos correctos y reporte por alumno/grupo; ajustar pruebas/reportes si el agregado por grupo requiere endpoint/helper explícito.
  - Verify: `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts` + smoke runtime del flujo `/admin/attendance` y drawer docente con persistencia/reload consistente.
  - Done when: El demo de slice se ejecuta extremo a extremo (admin y docente asignado) con resultados persistidos, reportados y auditables.

## Files Likely Touched

- `app/src/actions/attendance.ts`
- `app/src/actions/__tests__/attendance.authorization.test.ts`
- `app/src/actions/__tests__/attendance.persistence.test.ts`
- `app/src/actions/__tests__/attendance.reporting.test.ts`
- `app/src/app/admin/attendance/page.tsx`
- `app/src/components/AttendanceDrawer.tsx`
- `.gsd/milestones/M002/slices/S03/tasks/T01-PLAN.md`
- `.gsd/milestones/M002/slices/S03/tasks/T02-PLAN.md`
- `.gsd/milestones/M002/slices/S03/tasks/T03-PLAN.md`
