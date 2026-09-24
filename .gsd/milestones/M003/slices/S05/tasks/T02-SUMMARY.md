---
id: T02
parent: S05
milestone: M003
provides:
  - Admin Finanzas UI hardened to render visible stable error blocks (Código: STABLE_ERROR.* / UNKNOWN_ERROR) in tabs and modal, avoiding blank/loading-only failures.
key_files:
  - app/src/app/admin/finances/components/stableErrorUi.tsx
  - app/src/app/admin/finances/components/ConceptsTab.tsx
  - app/src/app/admin/finances/components/ChargesTab.tsx
  - app/src/app/admin/finances/components/RecordPaymentModal.tsx
key_decisions:
  - Stable error visibility in Admin is implemented as a local component-state `StableErrorDisplay` rendered via an AntD Alert; non-stable errors are coerced to `STABLE_ERROR.UNKNOWN_ERROR` but remain visible.
patterns_established:
  - For any finance mutation/listing: clear `stableError` before action, `catch` -> `setStableError(toStableErrorDisplay(err))`, `finally` -> always release loading state.
observability_surfaces:
  - UI block: `StableErrorUi` renders `Código: <code>` in each surface (Concepts tab, Charges tab, RecordPayment modal).
  - Manual repro: run dev server and trigger a failing action; verify the `Código:` block appears (no console dependency).
duration: 1h
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T02: Endurecer UI Admin finanzas para mostrar errores estables en tabs/modales (sin blanks)

**Shipped visible, retry-safe error surfaces for Admin Finanzas (Conceptos/Cargos/Pagos) that always display an explicit `Código:` and never leave the UI stuck in loading.**

## What Happened

- Implemented a shared UI error component `StableErrorUi` (AntD `Alert`) plus helpers:
  - `getStableErrorCode(err)` to detect when `err.message` matches a known `STABLE_ERROR.*` value.
  - `toStableErrorDisplay(err)` to coerce any error into `{ code, message }`, using `STABLE_ERROR.UNKNOWN_ERROR` when not stable.
- Updated Admin Finanzas client components to use explicit local `stableError` state instead of only `message.error(...)`:
  - `ConceptsTab.tsx`: list/create now set `stableError` on failure and render the block at top.
  - `ChargesTab.tsx`: list/generate now set `stableError` on failure and render the block at top.
    - Added `lastGenerateInfo` to make idempotency visible (e.g. “Idempotente: 0 creados …”) without treating it as an error.
  - `RecordPaymentModal.tsx`: recordManual errors are shown inside the modal via `StableErrorUi`; modal stays open on error; a `saving` state prevents infinite loading and disables Cancel during submit.

## Verification

Commands (slice-level gates):
- `pnpm -C app lint` (pass)
- `pnpm -C app test` (pass; includes `S05 failure visibility contract (finance server actions)`)
- `pnpm -C app build` (pass)

Manual runtime check:
- Started dev server and navigated to `/admin/finances`.
- Verified an error case renders a visible block containing `Código:` (browser assertion passed).

## Diagnostics

- Runtime surface: `/admin/finances`.
- When a finance action fails, the UI renders:
  - `StableErrorUi` → `Código: <STABLE_ERROR.* | UNKNOWN_ERROR>`
- To reproduce locally:
  - `pnpm -C app dev`
  - Navigate `/admin/finances` and trigger a failing action (RBAC/scope/tenant/session issue, or server-action failure).

## Deviations

- `stableErrorUi.ts` was renamed to `stableErrorUi.tsx` because it now contains JSX.

## Known Issues

- The page can still hard-fail if the session/tenant is not configured (e.g. “Tenant not found”), but it is now visible as `Código: UNKNOWN_ERROR` (or stable code when applicable) instead of a silent/blank failure.

## Files Created/Modified

- `app/src/app/admin/finances/components/stableErrorUi.tsx` — added `StableErrorUi` + coercion helpers for stable/unknown error rendering.
- `app/src/app/admin/finances/components/ConceptsTab.tsx` — render stable error block and ensure loading always clears.
- `app/src/app/admin/finances/components/ChargesTab.tsx` — render stable error block; show idempotency info (0 created) as non-error.
- `app/src/app/admin/finances/components/RecordPaymentModal.tsx` — render stable error block inside modal; keep modal open on error; add `saving` state.
- `.gsd/milestones/M003/slices/S05/S05-PLAN.md` — marked T02 as done.
