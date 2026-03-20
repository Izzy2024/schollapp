---
id: T02
parent: S02
milestone: M003
provides:
  - Prisma model FinancePayment + migration + stable finance error codes for S02 contract tests
key_files:
  - app/prisma/schema.prisma
  - app/prisma/migrations/20260320164412_finance_payment/migration.sql
  - app/src/lib/errors.ts
key_decisions:
  - FinancePayment is tenant-scoped and requires chargeId (MVP) with FK cascade; attachment is optional (SetNull) and createdBy is required.
patterns_established:
  - Prisma relations include explicit opposite fields on related models to satisfy schema validation.
observability_surfaces:
  - Stable error codes: STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND and STABLE_ERROR.FINANCE_PAYMENT_INVALID_AMOUNT
duration: 35m
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T02: Añadir modelo Prisma FinancePayment + migración + errores estables nuevos

**Added `FinancePayment` Prisma model (tenant-scoped, charge-linked), generated SQLite migration, and added stable error codes for S02 negative paths.**

## What Happened

- Extended `app/prisma/schema.prisma` with a new `FinancePayment` model designed for deterministic MVP manual payments:
  - Required `tenantId`, `studentId`, `chargeId`, `amountCents`, `paidAt`, `method`, `createdById`.
  - Optional `note`, `reference`, `attachmentId`.
  - Relations:
    - `FinancePayment.charge -> FinanceCharge` (required)
    - `FinancePayment.student -> Student` (required)
    - `FinancePayment.createdBy -> User` (required)
    - `FinancePayment.attachment -> Attachment?` (optional)
  - Added opposite relation fields to `Tenant`, `Student`, `User`, `FinanceCharge`, `Attachment`.
  - Added indices `@@index([tenantId, studentId, paidAt])` and `@@index([tenantId, chargeId])`.

- Ran Prisma format + migration to create/apply `20260320164412_finance_payment`.

- Confirmed stable error codes exist in `app/src/lib/errors.ts` for S02 contract tests:
  - `FINANCE_CHARGE_NOT_FOUND`
  - `FINANCE_PAYMENT_INVALID_AMOUNT`

## Verification

- Prisma schema validation + formatting:
  - `pnpm -C app exec prisma format`

- Migration + client generation (SQLite):
  - `pnpm -C app exec prisma migrate dev --name finance_payment`
  - `pnpm -C app exec prisma generate`

- Test compile/run check (expected RED for missing actions, but schema compiles):
  - `pnpm -C app test -- src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
  - Result: test runner executes but currently fails due to missing `src/actions/finance/payments.ts` and `statements.ts` (to be implemented in subsequent tasks).

## Diagnostics

- Inspect DB table + FKs/indices via:
  - Prisma migrations at `app/prisma/migrations/20260320164412_finance_payment/`
  - Prisma Studio (if used) or direct queries in tests against `prisma.financePayment`.

- Runtime error inspection uses stable codes:
  - `STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND`
  - `STABLE_ERROR.FINANCE_PAYMENT_INVALID_AMOUNT`

## Deviations

- None.

## Known Issues

- `payments-and-statement.actions.test.ts` is still RED because `app/src/actions/finance/payments.ts` and `app/src/actions/finance/statements.ts` are not present yet.

## Files Created/Modified

- `app/prisma/schema.prisma` — Added `FinancePayment` model + relations + indexes.
- `app/prisma/migrations/20260320164412_finance_payment/migration.sql` — SQLite migration adding the new table and constraints.
- `app/src/lib/errors.ts` — Stable error codes needed by S02 contract tests.
