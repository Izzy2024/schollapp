---
id: T01
parent: S03
milestone: M002
provides:
  - Suite de pruebas inicial (falla informativa) para contrato de autorización, persistencia/idempotencia y reportes de asistencia.
key_files:
  - app/src/actions/__tests__/attendance.authorization.test.ts
  - app/src/actions/__tests__/attendance.persistence.test.ts
  - app/src/actions/__tests__/attendance.reporting.test.ts
  - .gsd/milestones/M002/slices/S03/S03-PLAN.md
key_decisions:
  - Mantener pruebas de S03 en Node test runner con el mismo patrón de mocks de S02 para evitar infraestructura paralela.
  - Aceptar falla inicial por brecha de infraestructura de test runner (mock.module) y documentarla como prerequisito técnico para T02/T03.
patterns_established:
  - Suites separadas por categoría de gap (authorization/persistence/reporting) con mensajes de error estables esperados.
observability_surfaces:
  - Ninguna nueva en runtime; el diagnóstico queda en clasificación por suite y aserciones de códigos de error esperados.
duration: 35m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Crear suite de pruebas de asistencia (falla inicial) para autorización, persistencia y reportes

**Se dejó creada la suite inicial de contrato para S03 (autorización, persistencia/trazabilidad e informes) y se verificó falla reproducible de arranque para guiar implementación.**

## What Happened

Se validó el patrón de pruebas existente en `app/src/actions/__tests__` y quedaron disponibles los tres archivos de contrato de asistencia solicitados:

- `attendance.authorization.test.ts`
  - rol no permitido → `UNAUTHORIZED_SCOPE`
  - docente no asignado a `sectionSubjectId` → `UNAUTHORIZED_SCOPE`
  - acceso cross-tenant → `TENANT_SCOPE_VIOLATION`
- `attendance.persistence.test.ts`
  - estado inválido → `INVALID_ATTENDANCE_STATUS`
  - re-guardado idempotente por misma clave de sesión
  - trazabilidad de actor (`takenById`, `actorUserId`)
- `attendance.reporting.test.ts`
  - resumen por alumno con dataset mínimo
  - agregación básica por grupo (`bySection`) para R005

Además, se constató que el comando de verificación del plan debía ejecutarse desde `app/` (el `package.json` está en `app/package.json`, no en la raíz del repo).

## Verification

Comandos ejecutados:

1. En raíz del repo (como aparece en el plan):
   - `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts`
   - Resultado: falla por ausencia de `package.json` en raíz / script no aplicable en ese nivel.

2. En `app/` (ruta correcta del proyecto Node):
   - `cd app && npm test -- src/actions/__tests__/attendance.authorization.test.ts src/actions/__tests__/attendance.persistence.test.ts src/actions/__tests__/attendance.reporting.test.ts`
   - Resultado: falla reproducible y no espuria de setup con `TypeError: mock.module is not a function` (afecta también suites previas existentes).

Conclusión de verificación para T01:
- Se cumple el objetivo de **falla inicial informativa** (red en T01).
- La falla observada en este punto es mayormente de infraestructura del runner/mocking y será el primer punto técnico a resolver en T02 para poder validar los gaps funcionales en verde/rojo fino.

## Diagnostics

Para inspección futura:

- Re-ejecutar exactamente:
  - `cd app && npm test -- src/actions/__tests__/attendance.authorization.test.ts src/actions/__tests__/attendance.persistence.test.ts src/actions/__tests__/attendance.reporting.test.ts`
- Superficie de diagnóstico esperada por suite:
  - `authorization`: códigos de alcance (`UNAUTHORIZED_SCOPE`, `TENANT_SCOPE_VIOLATION`)
  - `persistence`: validación (`INVALID_ATTENDANCE_STATUS`) + idempotencia/trazabilidad (`takenById`, `actorUserId`)
  - `reporting`: agregados por alumno y por sección (`bySection`)

## Deviations

- El comando de verificación del plan está expresado relativo a raíz del monorepo, pero el proyecto ejecutable de tests vive en `app/`; se ejecutó con `cd app` para validación real.
- La falla inicial esperada quedó dominada por brecha de infraestructura (`mock.module`) antes de llegar al comportamiento de negocio; esto no invalida T01, pero condiciona T02.

## Known Issues

- El runner actual (`tsx --test`) no expone `mock.module` en este entorno, provocando fallo temprano de todas las suites que usan ese patrón (incluyendo suites existentes fuera de asistencia).

## Files Created/Modified

- `app/src/actions/__tests__/attendance.authorization.test.ts` — contrato inicial de autorización por rol/asignación/tenant.
- `app/src/actions/__tests__/attendance.persistence.test.ts` — contrato inicial de validación de estado, idempotencia y trazabilidad de actor.
- `app/src/actions/__tests__/attendance.reporting.test.ts` — contrato inicial de resumen por alumno y agregado por sección.
- `.gsd/milestones/M002/slices/S03/S03-PLAN.md` — marcado de T01 como completado.
