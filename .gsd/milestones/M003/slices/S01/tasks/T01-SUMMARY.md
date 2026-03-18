---
milestone: M003
slice: S01
task: T01
status: done
blocker_discovered: false
date: 2026-03-18
---

## Summary

Implemented the contract test suite for Slice S01 finances (ledger mínimo) covering the three highest-risk invariants:

- **RBAC**: only `admin|director` may perform write operations.
- **Tenant-scope**: a session from tenant A cannot operate on a finance concept owned by tenant B.
- **Idempotency / dedupe**: generating charges for the same `periodKey` twice must not create duplicates and must return `{ createdCount, skippedCount }`.

These tests are intentionally **RED** until T02 implements Prisma schema + actions.

## What changed

- Added **contract tests**: `app/src/actions/__tests__/finance.actions.test.ts`
  - Uses the approved seams:
    - `globalThis.__TEST_SESSION__` (via `auth()` override in `app/src/auth.ts`)
    - `globalThis.__TEST_PRISMA__` (via `app/src/lib/prisma.ts` + `getTestPrisma`)
  - Assumes upcoming modules:
    - `app/src/actions/financeConcept.ts` exporting `create(...)`
    - `app/src/actions/financeCharge.ts` exporting `generateForPeriod({ conceptId, periodKey })`
  - Defines stable error expectations:
    - `FINANCE_FORBIDDEN`
    - `(FINANCE_CONCEPT_NOT_FOUND | FINANCE_SCOPE_VIOLATION)`
  - Defines result payload contract:
    - `{ createdCount: number, skippedCount: number }`

- Updated slice verification command in: `.gsd/milestones/M003/slices/S01/S01-PLAN.md`
  - `pnpm -C app test -- finance.s01` was not a valid tsx/node:test filter in this repo.
  - Replaced with file-path filter:
    - `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts`

## Verification

- Ran: `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts`
  - **Fails as expected** with `ERR_MODULE_NOT_FOUND` because `financeConcept` / `financeCharge` actions do not exist yet (T02).

## Notes / contract details for T02

- The actions should throw errors whose `.message` matches the stable codes asserted by regex in tests.
- `generateForPeriod` must be idempotent per `(tenantId, studentId, conceptId, periodKey)`.
- The DB setup in tests assumes these Prisma models will exist:
  - `tenant`, `student`, `financeConcept`, `financeCharge`.
