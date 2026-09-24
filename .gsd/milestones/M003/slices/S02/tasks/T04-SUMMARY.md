---
id: T04
parent: S02
milestone: M003
provides:
  - Parent finances UI at /parent/finances rendering real statement from DB (charges/payments/balance) + dashboard wiring without finance mocks
key_files:
  - app/src/app/parent/finances/page.tsx
  - app/src/actions/parent.ts
  - app/src/app/parent/page.tsx
key_decisions:
  - Render /parent/finances as a Server Component using server action getForParent() (no client-side fetch) to keep data real + simplify error handling.
patterns_established:
  - Parent finance surfaces show stable error codes (err.code) in the UI instead of generic messages.
observability_surfaces:
  - UI error state includes stable error code; contract tests remain the backend diagnostic surface.
duration: 1h
verification_result: partial
completed_at: 2026-03-20
blocker_discovered: false
---

# T04: Construir UI Parent real en /parent/finances y remover mocks del dashboard parent

**Shipped**: `/parent/finances` now renders a real, tenant-scoped parent statement (charges − payments) from DB and the parent dashboard no longer uses hardcoded finance data.

## What Happened

- Converted/implemented `app/src/app/parent/finances/page.tsx` to call `getForParent()` and render:
  - Loading skeleton (initial server render state when data not yet present)
  - Empty state when parent has no charges/students
  - Error state that prints `error.code` (stable codes) for diagnosis
  - Per-student cards with saldo + lists of cargos and pagos (including conceptName/periodKey, method, paidAt, note)
- Updated `app/src/actions/parent.ts` to remove hardcoded finance numbers and instead derive `financial.balanceDueCents` from `getForParent()`.
- Updated `app/src/app/parent/page.tsx` to link the financial CTA to `/parent/finances`.

## Verification

- Contract tests (slice-level):
  - `pnpm -C app test src/actions/finance/__tests__/payments-and-statement.actions.test.ts` ✅ (4/4 passing)
- Build smoke (task-level):
  - `pnpm -C app build` ❌ fails due to a pre-existing unrelated TypeScript error in `src/app/director/enrollment/page.tsx` importing `react-chartjs-2` ("... is not a module").
- Runtime smoke:
  - `pnpm -C app dev` ✅ server starts (may choose port 3001 if 3000 occupied).
  - Browser navigation reached login; full E2E as Parent couldn’t be completed due to demo-login not exposing a Parent quick-login and form submission returning a generic error in this environment.

## Diagnostics

- UI surface: `/parent/finances` shows explicit error code text when `getForParent()` throws (e.g. stable finance errors).
- Backend diagnostic: re-run contract tests above to validate arithmetic + scoping.

## Deviations

- Implemented `/parent/finances` as a Server Component instead of client `useEffect` fetch to keep the page purely data-driven and consistent with server actions.

## Known Issues

- `pnpm -C app build` currently fails due to an unrelated TS/module typing issue in `src/app/director/enrollment/page.tsx` (`react-chartjs-2` import). Not introduced by this task.
- Demo login flow in local runtime did not allow logging in as Parent to visually validate the page with seeded data.

## Files Created/Modified

- `app/src/app/parent/finances/page.tsx` — Real statement UI consuming `getForParent()` with loading/empty/error/data states.
- `app/src/actions/parent.ts` — Removed finance mock; derives `balanceDueCents` from the real statement.
- `app/src/app/parent/page.tsx` — CTA links to `/parent/finances`.
