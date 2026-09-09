---
estimated_steps: 7
estimated_files: 3
---

# T01: Add failing contract tests for finance ActivityEvents + feed filter

**Slice:** S03 — Observabilidad financiera (ActivityEvent) + superficie de auditoría
**Milestone:** M003

## Description

Create the objective stopping condition for S03: node:test contract tests that prove finance mutations emit `ActivityEvent` rows and that the Activity Feed filter/taxonomy exposes them correctly. This task should land **failing tests first** (red), so subsequent tasks can make them pass.

## Steps

1. Create `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`.
2. Use test seams (`getTestPrisma()` / `setTestPrisma()` and `__TEST_SESSION__`) to run actions without `mock.module`.
3. Seed minimal data in the test DB: tenant, admin user, parent user, student, and a finance concept.
4. Call `financeCharge.generateForPeriod(...)` (or current S01 action entrypoint) to create at least 1 charge.
5. Call `financePayment.recordManual(...)` (or current S02 action entrypoint) to record a payment.
6. Assert `db.activityEvent.findMany({ where: { tenantId, entityType:'finance' }})` includes expected `action` values and metadata fields.
7. Call `getRecentActivities(undefined, 'finance', 1, 50)` and assert returned list only contains `entityType === 'finance'` and includes the finance events.

## Must-Haves

- [ ] Test suite uses seams (`__TEST_PRISMA__` / `__TEST_SESSION__`) and does not rely on `mock.module`.
- [ ] Tests assert both persistence (`ActivityEvent` rows) and feed filtering (`getRecentActivities` with filter `finance`).
- [ ] Tests cover idempotency expectation: re-running charge generation does **not** increase count of `finance.charge.created` events for the same charge.

## Verification

- `pnpm -C app test --filter finance-activity` (if the runner supports filtering) OR `pnpm -C app test`.
- Expectation for this task: tests fail because taxonomy and/or event emission is not implemented yet.

## Observability Impact

- Signals added/changed: None (tests only).
- How a future agent inspects this: Run the test file to reproduce missing/duplicated event issues deterministically.
- Failure state exposed: Pinpoints whether the failure is taxonomy/filtering vs event emission vs idempotency.

## Inputs

- `app/src/actions/activity.ts` — feed query action used by UI.
- `app/src/lib/activity-taxonomy.ts` — filter normalization and entity type taxonomy.
- `app/src/actions/finance/charges.ts`, `app/src/actions/finance/payments.ts` — mutation entrypoints under test.

## Expected Output

- `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts` — failing contract tests that define S03 completion criteria.
