---
estimated_steps: 6
estimated_files: 4
---

# T01: Consolidar suite de verificación M003 sin mock.module (tests “oficiales” en rojo primero)

**Slice:** S04 — Estabilización (lint/types/build) + suite de verificación sin mock.module
**Milestone:** M003

## Description

Crear y estandarizar la suite de pruebas que será la **señal de verificación oficial** de M003, evitando por completo `node:test mock.module` (no disponible/fragil). La suite debe correr de forma consistente con `pnpm -C app test` y cubrir contratos críticos: tenant-scope derivado de sesión, RBAC (parent no muta), dedupe/idempotencia de cargos por periodo, saldo determinista (cargos − pagos) y presencia de `finance.*` en Activity con `metadata` JSON parse-safe.

El objetivo inmediato es: (1) asegurar que el runner recoja los tests; (2) introducir tests reales con seams; (3) confirmar que el pipeline puede ponerse en rojo “a propósito” para validar que realmente se ejecuta.

## Steps

1. Revisar (rápido) el comando actual de `pnpm -C app test` en `app/package.json` y confirmar el patrón de descubrimiento de `tsx --test` (naming/paths).
2. Crear `app/src/actions/finance/__tests__/finance.contract.test.ts` con tests usando **solo** `globalThis.__TEST_SESSION__` y `globalThis.__TEST_PRISMA__` (via seams). Incluir subcasos:
   - RBAC: parent intentando mutar (ej. `recordManual` o `generateForPeriod`) ⇒ stable error.
   - Dedupe: dos llamadas a `generateForPeriod` con mismos inputs ⇒ no duplica (en el stub, contar creates/upserts o simular unique constraint).
   - Saldo: statement refleja suma cargos − suma pagos.
3. Crear `app/src/actions/activity.__tests__/finance-activity.contract.test.ts` que valide que una mutación financiera emite `ActivityEvent` con `action` `finance.*` y `metadata` parseable (sin PII).
4. Agregar (temporalmente) una aserción intencionalmente fallida (ej. `assert.equal(1, 2)`) bajo un comentario `// RED PROBE (remove in T04)` para demostrar que el runner está ejecutando esta suite.
5. Ejecutar `pnpm -C app test` y confirmar que el fallo proviene del archivo nuevo (no de tests legacy).
6. Documentar en comentarios del test la convención: **no** usar `mock.module`; si se requiere seam, usar `test-seams.ts`.

## Must-Haves

- [ ] Los tests nuevos se ejecutan al correr `pnpm -C app test` y pueden forzar rojo (prueba de ejecución real).
- [ ] Los tests no importan ni usan `mock.module` ni mocks de módulos.
- [ ] Se usan seams oficiales (`__TEST_SESSION__`/`__TEST_PRISMA__`) y las aserciones apuntan a contratos críticos (scope/RBAC/dedupe/saldo/activity).

## Verification

- `pnpm -C app test` ⇒ debe fallar por el `RED PROBE` y el stacktrace debe referenciar los nuevos test files.
- `rg "mock\\.module" app/src/actions/finance/__tests__/finance.contract.test.ts app/src/actions/activity.__tests__/finance-activity.contract.test.ts` ⇒ sin matches.

## Observability Impact

- Signals added/changed: Falla de tests con mensajes explícitos por contrato (RBAC/scope/dedupe/saldo), reforzando diagnóstico durante regresiones.
- How a future agent inspects this: ejecutar `pnpm -C app test` y leer qué contrato falló + dónde.
- Failure state exposed: mensajes de aserción y stable error codes esperados.

## Inputs

- `app/src/lib/test-seams.ts` — seam oficial para sesión/prisma en tests.
- `app/src/auth.ts` y `app/src/lib/prisma.ts` — consumen `getTestSession()` / `getTestPrisma()`.

## Expected Output

- `app/src/actions/finance/__tests__/finance.contract.test.ts` — pruebas contractuales M003 (con `RED PROBE` temporal).
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts` — pruebas de trazabilidad `finance.*` (con `RED PROBE` o dependencia del mismo).
- (Opcional) `app/package.json` — ajuste mínimo si el runner no recoge los tests (solo si es necesario, sin cambiar el framework).
