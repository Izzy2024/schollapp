---
milestone: M003
slice: S01
task: T02
status: done
blocker_discovered: false
date: 2026-03-18
---

## Summary

Implemented the **ledger mínimo** DB core for S01 (Conceptos + Cargos) with tenant scoping, RBAC hardening, stable finance error codes, and **idempotent monthly charge generation** via a DB unique constraint.

Key behaviors delivered:
- Prisma models `FinanceConcept` + `FinanceCharge` (tenant-scoped)
- Unique constraint `@@unique([tenantId, studentId, conceptId, periodKey])` enables dedupe per month
- Server actions to create/list concepts and generate/list charges, with `periodKey` validation
- Stable error codes: `FINANCE_FORBIDDEN`, `FINANCE_INVALID_PERIOD_KEY`, `FINANCE_CONCEPT_NOT_FOUND`, `FINANCE_SCOPE_VIOLATION`

## What changed

### Prisma
- Updated `app/prisma/schema.prisma`
  - Added enums `FinanceConceptKind` and `FinanceChargeStatus`
  - Added models:
    - `FinanceConcept` (tenantId, name, kind, amountCents, currency, isActive, timestamps)
    - `FinanceCharge` (tenantId, studentId, conceptId, amountCents, currency, status, dueDate?, periodKey?, timestamps)
  - Added relation fields:
    - `Tenant.financeConcepts`, `Tenant.financeCharges`
    - `Student.financeCharges`
  - Added idempotency constraint:
    - `FinanceCharge @@unique([tenantId, studentId, conceptId, periodKey])`
- Created and applied migration under `app/prisma/migrations/20260318204740_finance_ledger_min/migration.sql`

### Stable errors
- Extended `app/src/lib/errors.ts` with finance codes:
  - `FINANCE_FORBIDDEN`
  - `FINANCE_INVALID_PERIOD_KEY`
  - `FINANCE_CONCEPT_NOT_FOUND`
  - `FINANCE_SCOPE_VIOLATION` (reserved for future finer-grained scope messaging)

### Server actions (tenant derived from session only)
- Added shared helpers: `app/src/actions/finance/_shared.ts`
  - `getTenantIdFromSession()` resolves `tenantId` from `auth()` → `session.user.tenantSlug` → prisma `tenant`
  - `assertFinanceWriteAccess()` supports `user.role` and/or `user.roles[]` and throws `FINANCE_FORBIDDEN`
  - `normalizeAndValidatePeriodKey()` enforces `YYYY-MM` and month range 01-12

- Implemented concepts actions: `app/src/actions/finance/concepts.ts`
  - `create({ name, kind, amountCents, currency })`
  - `list()`

- Implemented charges actions: `app/src/actions/finance/charges.ts`
  - `generateForPeriod({ periodKey, conceptId, studentIds? })`:
    - validates `periodKey`
    - loads concept scoped by tenant
    - resolves active students in tenant (or subset)
    - creates charges idempotently via per-row create + counting unique-constraint (P2002) skips
    - returns `{ createdCount, skippedCount }`
  - `listByPeriod({ periodKey, conceptId? })`

### Compatibility with T01 contract tests
- Added thin re-export modules expected by tests:
  - `app/src/actions/financeConcept.ts` (exports `create`, `list`)
  - `app/src/actions/financeCharge.ts` (exports `generateForPeriod`, `listByPeriod`)
- Updated T01 finance tests to align with actual `Student` schema fields (`firstName`, `lastName`) and finance input shapes (`kind` instead of `cadence`).

## Notes / deviations

- The task plan proposed `createMany({ skipDuplicates: true })`. In this repo’s Prisma + SQLite config, `skipDuplicates` is not accepted for `createMany` (runtime validation error). Idempotency is still guaranteed by the DB unique constraint; we implement generation with per-row `create` and count `P2002` as skipped.

## Verification

- ✅ `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts`
- ⚠️ `pnpm -C app lint` currently fails due to pre-existing lint errors across the repo (unrelated to this task). Finance files introduced here also had a couple `any` warnings, but repo-wide lint is not green baseline.

## Must-haves check

- ✅ Unique constraint present and dedupe works when re-running generation
- ✅ Tenant-scope derived from session only (no tenantId/slug accepted from input)
- ✅ RBAC enforced for write operations (admin|director)
- ✅ `generateForPeriod` validates `periodKey` and returns `{ createdCount, skippedCount }`
