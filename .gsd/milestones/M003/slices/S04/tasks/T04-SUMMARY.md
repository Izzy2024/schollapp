---
task: T04
slice: S04
milestone: M003
status: done
blocker_discovered: false
created_at: 2026-03-20
---

## Outcome
Closed S04 with **real gates green** and **diagnostic contract tests** (no artificial failures, no `mock.module`).

## What changed

### 1) Removed artificial failure probes
- Confirmed there are **no remaining `// RED PROBE` markers** and **no intentionally-failing assertions** in the M003/S04 contract tests.

### 2) Hardened test diagnostics (clear contract failure messages)
- Updated assertion messages to clearly state:
  - which contract failed (RBAC / dedupe / activity metadata)
  - how to reproduce (set session role + call mutation; call generate twice; read ActivityEvent)

Files:
- `app/src/actions/finance/__tests__/finance.contract.test.ts`
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`

### 3) Gate readiness note (DB schema requirement)
- The finance/activity contract suites require a Prisma DB with schema applied.
- Ran `pnpm -C app prisma db push --schema prisma/schema.prisma` locally to ensure `app/prisma/dev.db` has required tables.
  - (This is not a mock; it’s the real schema sync needed for the contract tests.)

## Verification (required gates)
Executed in exact sequence:
- ✅ `pnpm -C app lint`
- ✅ `pnpm -C app test`
- ✅ `pnpm -C app build`

## Diagnostics / how failures surface
- RBAC regressions: test fails with message indicating parent mutation should be forbidden and expects a stable forbidden-ish error.
- Dedupe regressions: test fails specifying expected createdCount/skippedCount and exact DB row count.
- Activity regressions: test fails specifying missing `finance.*` event or metadata JSON parse failure.

## Files changed
- `app/src/actions/finance/__tests__/finance.contract.test.ts`
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`
- `app/prisma/dev.db` (schema applied via `prisma db push`)
