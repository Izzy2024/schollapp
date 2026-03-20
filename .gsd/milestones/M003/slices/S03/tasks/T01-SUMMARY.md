---
id: T01
parent: S03
milestone: M003
provides:
  - failing node:test contract suite for finance ActivityEvent emission + activity feed finance filter
key_files:
  - app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts
key_decisions:
  - Use real Prisma DB via __TEST_PRISMA__ seam (no mock.module) and NextAuth bypass via __TEST_SESSION__.
patterns_established:
  - Contract tests assert both persistence (ActivityEvent rows) and query surface (getRecentActivities filter).
observability_surfaces:
  - none (tests only)
duration: 45m
verification_result: failed (expected-red)
completed_at: 2026-03-20
blocker_discovered: false
---

# T01: Add failing contract tests for finance ActivityEvents + feed filter

**Added failing (red) contract tests that codify S03 completion: finance mutations must persist `ActivityEvent` rows and the Activity Feed must filter them via `getRecentActivities(...,'finance',...)`.**

## What Happened

- Created a new `node:test` suite under `app/src/actions/activity.__tests__/`.
- The suite uses the repo’s test seams:
  - `globalThis.__TEST_SESSION__` to bypass NextAuth and authenticate server actions.
  - `globalThis.__TEST_PRISMA__` (via `@/lib/prisma` + `getTestPrisma`) to ensure server actions use the test DB connection without mocking modules.
- Seeds minimal DB state: tenant, admin user, parent user, student, finance concept.
- Executes finance mutations:
  - `financeCharge.generateForPeriod(...)` to create at least one charge.
  - `financePayment.recordManual(...)` to create a payment.
- Asserts required *persisted audit trail* and *feed surface*:
  - `ActivityEvent` rows exist for `entityType='finance'` with actions `finance.charge.created` and `finance.payment.recorded`.
  - `getRecentActivities(undefined, 'finance', 1, 50)` returns only `entityType === 'finance'` and includes those actions.
  - Idempotency contract: running generation twice must not create >1 `finance.charge.created` event for the same created charge.

## Verification

- Ran: `cd app && pnpm test src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`
  - Result: **fails (expected for T01)**.
  - Failure evidence:
    - Missing `finance.charge.created` ActivityEvent.
    - Idempotency assertion shows `0 !== 1` events for charge.
- Note: `pnpm -C app test --filter ...` is not supported by the current `tsx --test` runner in this repo (`--filter` is rejected).

## Diagnostics

To reproduce the slice gap deterministically:

- `cd app && pnpm test src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`
- Inspect DB in failing run by adding temporary debugging or querying:
  - `db.activityEvent.findMany({ where: { tenantId, entityType: 'finance' } })`

The failure location helps differentiate:
- event emission missing vs
- taxonomy/filter missing (`getRecentActivities(...,'finance')`) vs
- idempotency/duplication behavior.

## Deviations

- Used a direct file-path test invocation (`pnpm test <file>`) because `tsx --test` does not support `--filter` in this repo.

## Known Issues

- Tests are intentionally red until S03 T02/T03 implement:
  - taxonomy support for `finance` (entity type + filter), and
  - finance server actions emitting `ActivityEvent` rows idempotently.

## Files Created/Modified

- `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts` — failing contract tests for finance ActivityEvents + finance feed filter + idempotency expectation.
- `.gsd/milestones/M003/slices/S03/S03-PLAN.md` — marked T01 as complete.
