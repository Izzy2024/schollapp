---
id: T01
parent: S05
milestone: M003
provides:
  - finance failure-visibility contract test (stable STABLE_ERROR.* code propagation)
key_files:
  - app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts
  - app/src/test-runner.ts
key_decisions:
  - Treat StableError as Error.message==STABLE_ERROR.* for contract assertion (until a dedicated error shape exists)
patterns_established:
  - Contract tests must assert stable error code explicitly (not regex-only) to prevent UNKNOWN_ERROR regressions
observability_surfaces:
  - pnpm -C app test (runner includes failure-visibility contract gate)
duration: 25m
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T01: Agregar verificación automatizada de “failure visibility” (códigos estables) para finanzas

**Added a Node contract test that forces a deterministic finance RBAC failure and asserts the propagated stable error code is exactly `STABLE_ERROR.FINANCE_FORBIDDEN`.**

## What Happened

- Inspected finance server actions and picked the cheapest deterministic failure: RBAC denial via `assertFinanceWriteAccess()`.
- Implemented a new contract test that:
  - Seeds a minimal tenant + concept.
  - Sets a **parent** session via the official global seam (`globalThis.__TEST_SESSION__`).
  - Calls a finance mutation (`generateForPeriod`) and captures the thrown error.
  - Extracts a stable code from `error.code` (if present) or `error.message` (current StableError implementation) and asserts it equals `STABLE_ERROR.FINANCE_FORBIDDEN`.
  - Also asserts it is not `UNKNOWN_ERROR`.
- Registered the test in the centralized `app/src/test-runner.ts` so it always runs in `pnpm -C app test`.

## Verification

- Ran:
  - `pnpm -C app test`
- Result: PASS (new suite executed and passed).

## Diagnostics

- To inspect/confirm the gate later:
  - Run `pnpm -C app test`.
  - Look for suite: `S05 failure visibility contract (finance server actions)`.
  - If it fails, it prints the received `code` vs expected `STABLE_ERROR.FINANCE_FORBIDDEN`.

## Deviations

- None.

## Known Issues

- The repo’s `stableError()` currently returns `new Error(code)` (no dedicated `error.code` field). The contract test intentionally supports both shapes (`error.code` OR `error.message`) but asserts the stable code value explicitly.

## Files Created/Modified

- `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts` — new failure-visibility contract test asserting stable RBAC error code propagation.
- `app/src/test-runner.ts` — imports the new contract test so it always runs.
