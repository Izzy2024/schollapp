---
estimated_steps: 6
estimated_files: 2
---

# T01: Definir verificación (tests) para dedupe/RBAC/tenant-scope de finanzas

**Slice:** S01 — Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin
**Milestone:** M003

## Description

Crear la suite de verificación de contrato para S01 antes de implementar schema/actions/UI. Los tests deben usar los seams aprobados (`__TEST_PRISMA__`, `__TEST_SESSION__`) y validar los invariantes más riesgosos del MVP: tenant-scope, RBAC y dedupe idempotente de cargos mensuales por `periodKey`.

## Steps

1. Crear `app/src/actions/__tests__/finance.actions.test.ts` usando `node:test` y el patrón de `announcements.actions.test.ts` (sin `mock.module`).
2. Preparar DB de test (usar seam `__TEST_PRISMA__`): crear 2 tenants, 1 concepto mensual por tenant, y 1–2 students por tenant.
3. Caso RBAC: con sesión `role/roles` no admin|director, llamar a `financeConcept.create` o `financeCharge.generateForPeriod` y assert de error estable `FINANCE_FORBIDDEN`.
4. Caso tenant-scope: con sesión de tenant A intentar generar cargos usando `conceptId` de tenant B y assert de error estable (p.ej. `FINANCE_CONCEPT_NOT_FOUND` o `FINANCE_SCOPE_VIOLATION`, según contrato final).
5. Caso idempotencia: con sesión tenant A generar cargos para `periodKey='2026-03'` dos veces y assert de no-duplicados (createdCount primera vez >0, segunda vez createdCount=0 y/o skippedCount>0) + conteo en DB = 1 por (student, concept, periodKey).
6. Agregar el “tag” o naming para filtrar: describir suite como `finance.s01` o incluir patrón para `pnpm -C app test -- finance.s01`.

## Must-Haves

- [ ] Tests usan seams `__TEST_PRISMA__` y `__TEST_SESSION__` (sin mocks del runner).
- [ ] Tests cubren: RBAC, tenant-scope y dedupe por `periodKey` con asserts explícitos.

## Verification

- `pnpm -C app test -- finance.s01`
- Confirmar que al menos 1 test falla inicialmente (esperado) hasta que T02 implemente schema/actions.

## Observability Impact

- Signals added/changed: None (tests only), pero define el contrato de errores estables y payloads `{createdCount, skippedCount}`.
- How a future agent inspects this: correr `pnpm -C app test -- finance.s01` para aislar regresiones de scope/dedupe.
- Failure state exposed: fallas con mensajes assertivos (código estable esperado vs recibido).

## Inputs

- `app/src/lib/test-seams.ts` — seams de sesión/Prisma para tests confiables.
- Patrones existentes de tests de acciones (announcements) para estructura.

## Expected Output

- `app/src/actions/__tests__/finance.actions.test.ts` — suite de contrato para S01 (roja hasta T02).
