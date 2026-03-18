---
estimated_steps: 4
estimated_files: 4
---

# T01: Crear suite de pruebas de asistencia (falla inicial) para autorización, persistencia y reportes

**Slice:** S03 — Control de Asistencia
**Milestone:** M002

## Description

Definir primero el contrato ejecutable de S03 mediante pruebas enfocadas en autorización por alcance, validación de estados, idempotencia de guardado y reporte básico. Este task debe dejar tests fallando de forma informativa para guiar la implementación en T02.

## Steps

1. Revisar el patrón de pruebas existente en `app/src/actions/__tests__` para reutilizar setup/fixtures y evitar infraestructura paralela.
2. Crear `attendance.authorization.test.ts` con casos de rol no permitido, docente no asignado a `sectionSubjectId`, y acceso cross-tenant.
3. Crear `attendance.persistence.test.ts` con casos de estado inválido, re-guardado idempotente y aserciones esperadas de `takenById`.
4. Crear `attendance.reporting.test.ts` con dataset mínimo y aserciones de resumen por alumno/grupo; ejecutar suite y documentar falla inicial esperada.

## Must-Haves

- [ ] Las pruebas cubren explícitamente R005 (control diario + reportes) y soporte R006 (trazabilidad de actor).
- [ ] Al menos una prueba falla por cada brecha principal detectada en research (autorización, trazabilidad, validación de estado).

## Verification

- `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts`
- El resultado muestra fallas esperadas y reproducibles alineadas al gap actual (no fallas espurias de setup).

## Observability Impact

- Signals added/changed: None (solo pruebas), pero define contrato de errores estables esperados.
- How a future agent inspects this: ejecución directa de los 3 archivos de test para localizar categoría de falla.
- Failure state exposed: clasificación clara por suite (`authorization`, `persistence`, `reporting`) para acotar diagnóstico.

## Inputs

- `app/src/actions/attendance.ts` — comportamiento actual a validar.
- S03 research preloaded — brechas de autorización, trazabilidad y normalización de estado.

## Expected Output

- `app/src/actions/__tests__/attendance.authorization.test.ts` — contrato de alcance/rol documentado en pruebas.
- `app/src/actions/__tests__/attendance.persistence.test.ts` — contrato de validación/idempotencia/takenBy.
- `app/src/actions/__tests__/attendance.reporting.test.ts` — contrato de reporte básico por alumno/grupo.
