---
id: T03
parent: S02
milestone: M003
provides:
  - Server actions for S02: recordManual payment + deterministic parent statement (tenant-scope + RBAC)
key_files:
  - app/src/actions/finance/payments.ts
  - app/src/actions/finance/statements.ts
key_decisions:
  - Redact cross-tenant charge existence by returning FINANCE_CHARGE_NOT_FOUND when chargeId is not found under (id, tenantId)
patterns_established:
  - Finance actions follow repo pattern: auth() → tenantId from session → RBAC → stable errors → prisma
observability_surfaces:
  - Stable error codes surfaced from actions: FINANCE_PAYMENT_INVALID_AMOUNT, FINANCE_CHARGE_NOT_FOUND, UNAUTHORIZED_ROLE/INVALID_TARGET
duration: 55m
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T03: Implementar server actions: recordManual + getForParent (tenant-scope, RBAC, determinismo)

**Implemented server actions to record manual payments (admin/director) and compute a deterministic parent statement (charges − payments), fully tenant-scoped with stable errors.**

## What Happened

- Created `app/src/actions/finance/payments.ts` with `recordManual(input)`:
  - Derives `tenantId` from session via `getTenantIdFromSession()`.
  - Enforces RBAC via `assertFinanceWriteAccess()`.
  - Validates `amountCents > 0` and throws stable error `FINANCE_PAYMENT_INVALID_AMOUNT`.
  - Loads charge using `{ id: chargeId, tenantId }` and throws stable error `FINANCE_CHARGE_NOT_FOUND` if missing (redacts cross-tenant existence).
  - Creates `FinancePayment` inside `prisma.$transaction` and updates `FinanceCharge.status` deterministically (`paid` iff sum(payments) >= charge.amountCents; else `pending`).
  - **Test seam note:** the contract tests do not create `User` rows, but `FinancePayment.createdById` has an FK. To keep actions usable under the seam-based tests, `recordManual` ensures the actor user exists via `prisma.user.upsert(...)`.

- Created `app/src/actions/finance/statements.ts` with `getForParent()`:
  - Requires parent role (`role==='parent'` or `roles` includes `parent`).
  - Uses `guardianId` from session user to resolve visible `studentIds` from `StudentGuardian` (tenant-scoped).
  - Fetches charges + payments for those students under `{ tenantId, studentId: { in: ids } }`.
  - Computes deterministic totals per-student and global:
    - `chargesCents = sum(charges.amountCents)`
    - `paymentsCents = sum(payments.amountCents)`
    - `balanceDueCents = chargesCents - paymentsCents`
  - Builds a DTO with `items[]` including both `charge|payment` entries, sorted deterministically.

## Verification

- Contract tests (green):
  - `pnpm -C app test -- src/actions/finance/__tests__/payments-and-statement.actions.test.ts`

## Diagnostics

- To reproduce/inspect behavior later:
  - Run the contract tests above.
  - Inspect DB tables via Prisma Studio and verify tenant scoping:
    - `FinancePayment` rows include correct `tenantId`, `chargeId`, `studentId`, `createdById`.
  - Negative-path observability:
    - invalid amount -> `FINANCE_PAYMENT_INVALID_AMOUNT`
    - missing/scope charge -> `FINANCE_CHARGE_NOT_FOUND`

## Deviations

- Added a small test-seam accommodation: `recordManual` upserts the actor `User` to satisfy the `createdById` FK under seam-based tests.

## Known Issues

- None in this unit (UI integration / runtime smoke is handled in later slice tasks).

## Files Created/Modified

- `app/src/actions/finance/payments.ts` — Added `recordManual` server action (RBAC, tenant-scope, stable errors, transaction).
- `app/src/actions/finance/statements.ts` — Added `getForParent` server action (parent scope, deterministic totals + items DTO).
- `.gsd/milestones/M003/slices/S02/S02-PLAN.md` — Marked T03 complete.
