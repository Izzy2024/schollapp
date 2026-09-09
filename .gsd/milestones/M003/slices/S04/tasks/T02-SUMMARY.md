---
id: T02
parent: S04
milestone: M003
provides:
  - Next build green by aligning finance statement DTO with /parent/finances UI
key_files:
  - app/src/actions/finance/statements.ts
  - app/src/app/parent/finances/page.tsx
key_decisions:
  - Expose only FinanceConcept.name on parent statement charges (allowed, non-PII) and map to flat conceptName for UI stability
patterns_established:
  - DTO mapping at action boundary (Prisma select -> explicit DTO) to avoid leaking Prisma shapes into UI
observability_surfaces:
  - none
duration: 45m
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T02: Arreglar build Next alineando DTO/UI de /parent/finances (sin any)

**Aligned `financeStatement.getForParent()` DTO with `/parent/finances` by selecting `concept.name` and returning a typed `conceptName` field (no `any`), unblocking `pnpm -C app build`.**

## What Happened

- Investigated the build failure: `/parent/finances/page.tsx` rendered `c.conceptName`, but `getForParent()` returned charges without that field.
- Updated `app/src/actions/finance/statements.ts`:
  - Added explicit DTO types (`FinanceStatementChargeDTO`, `FinanceStatementPaymentDTO`).
  - Updated Prisma `financeCharge.findMany` select to include `conceptId` and `concept: { name }`.
  - Mapped Prisma rows to DTOs, flattening `concept.name` to `conceptName`.
  - Removed `any` casts previously used for `charges`/`payments` mapping.
  - Replaced unsafe `(ctx.user as any).guardianId` with a type-safe `'guardianId' in ctx.user` check.
- UI (`app/src/app/parent/finances/page.tsx`) required no change because it already expects `conceptName`.

Build then surfaced an unrelated repo-level issue (Next/Turbopack root inference + missing dependency). To complete the slice gate for build:
- Set `turbopack.root` in `app/next.config.ts` to avoid Next inferring the wrong workspace root from unrelated lockfiles.
- Installed missing dependency `date-fns` required by `src/actions/students.ts` which Turbopack bundling surfaced.

## Verification

- `pnpm -C app build` ✅
  - TypeScript now compiles `/parent/finances` and the full build completes.

- `pnpm -C app test` ⚠️
  - Still fails due to the intentional **RED PROBE** assertion in `finance.contract.test.ts` (planned removal in T04).

## Diagnostics

- If DTO/UI desync regresses, `pnpm -C app build` will fail with a TS error in:
  - `app/src/app/parent/finances/page.tsx` (missing `conceptName`)
  - or `app/src/actions/finance/statements.ts` (wrong mapping/select)

## Deviations

- Added `turbopack.root` in `app/next.config.ts` and installed `date-fns` to make `pnpm -C app build` pass. These were not in the original T02 steps, but were necessary because the build gate surfaced them after the DTO fix.

## Known Issues

- `pnpm -C app test` remains red due to the deliberate `assert.equal(1, 2)` in `app/src/actions/finance/__tests__/finance.contract.test.ts` (planned for T04).

## Files Created/Modified

- `app/src/actions/finance/statements.ts` — Select `concept.name` and return typed `conceptName` in charges; remove `any`.
- `app/next.config.ts` — Set `turbopack.root` to project dir to avoid wrong workspace root inference.
- `app/package.json` — Added `date-fns` dependency (required for build).
- `app/pnpm-lock.yaml` — Lock update for dependency install.
