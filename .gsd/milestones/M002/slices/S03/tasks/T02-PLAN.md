---
estimated_steps: 5
estimated_files: 3
---

# T02: Endurecer actions de asistencia (autorización por alcance + validación de estado + trazabilidad actor)

**Slice:** S03 — Control de Asistencia
**Milestone:** M002

## Description

Implementar en server actions el hardening de negocio para cerrar riesgos de seguridad y calidad de datos: autorización explícita por rol/alcance tenant, validación estricta de estados permitidos y persistencia de actor en sesión/eventos.

## Steps

1. Introducir guard reutilizable en `attendance.ts` para validar tenant, rol permitido y ownership docente sobre `sectionSubjectId`/`sectionId`.
2. Definir lista/capa de validación de estados permitidos (`present|absent|late|excused`) y rechazar cualquier valor fuera de catálogo antes de persistir.
3. Ajustar flujo de guardado para persistir `AttendanceSession.takenById` en upsert.
4. Ajustar creación de `ActivityEvent` para registrar `actorUserId` y metadata estructurada útil para auditoría.
5. Ejecutar suite de T01, corregir inconsistencias y dejar todos los tests en verde.

## Must-Haves

- [ ] No existe camino de escritura de asistencia sin pasar por guard de alcance/rol.
- [ ] No se persisten estados fuera del catálogo permitido, y el error retornado es estable/diagnosticable.
- [ ] Cada guardado exitoso deja trazabilidad de actor en sesión y bitácora.

## Verification

- `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts`
- Confirmar en pruebas negativas que no hay inserciones/updates al rechazar autorización o estado inválido.

## Observability Impact

- Signals added/changed: `ActivityEvent.actorUserId`, metadata consistente de asistencia, errores de guard/validación estables.
- How a future agent inspects this: revisar `ActivityEvent` + ejecutar suite para discriminar falla de auth vs estado inválido vs reporte.
- Failure state exposed: motivo de rechazo consistente (`UNAUTHORIZED_SCOPE` / `INVALID_ATTENDANCE_STATUS` o equivalente) sin datos sensibles.

## Inputs

- `app/src/actions/__tests__/attendance.*.test.ts` — contrato definido en T01.
- `app/src/actions/attendance.ts` — implementación actual de lectura/guardado.

## Expected Output

- `app/src/actions/attendance.ts` — actions endurecidas con guardrails y trazabilidad completa.
- (Opcional) `app/prisma/schema.prisma` — solo si se requiere ajuste menor de tipo/alineación sin cambio de alcance funcional.
