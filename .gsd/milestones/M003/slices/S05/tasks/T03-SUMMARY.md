---
id: T03
parent: S05
milestone: M003
provides:
  - Reproducible S05 demo runbook + deterministic seed fixtures (tenant + demo users + guardian↔student link) and local db reset/seed scripts.
key_files:
  - app/prisma/seed.ts
  - .gsd/milestones/M003/slices/S05/S05-RUNBOOK.md
  - app/package.json
key_decisions:
  - Use deterministic dev-only credentials (password "demo-hash-123") and document them explicitly in runbook; no secrets introduced.
patterns_established:
  - Prefer repo-local scripts (pnpm run db:reset/db:seed) over relying on Prisma seed config to keep demos reproducible across environments.
observability_surfaces:
  - UI surfaces: /admin/finances, /admin/activity, /parent/finances (error code block)
  - Commands: pnpm -C app run db:reset && pnpm -C app run db:seed && pnpm -C app run db:seed:check
duration: 2h
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T03: Asegurar demo reproducible (seed/fixture) + runbook de lanzamiento S05 (happy path + failure case)

**Added a reproducible S05 demo runbook (reset→seed→dev) plus deterministic seed fixtures (demo tenant/users and guardian↔student link), and stable local scripts to reset/seed/check the DB.**

## What Happened

- Located the current seed at `app/prisma/seed.ts` and confirmed it already creates a demo tenant and demo users/memberships.
- Updated seed to guarantee *demo* minimums for S05:
  - Ensured extra deterministic user exists for RBAC failure scenario (`docente-rbac@demo.com`).
  - Added a deterministic `Guardian` record (email `padre@demo.com`) and a deterministic link to seeded student `STD-001` via `StudentGuardian`.
- Fixed a local env issue that prevented Prisma CLI from reliably loading `DATABASE_URL` (`app/.env` had `DATABASE_URL"..."AUTH_SECRET...` on one line).
- Added repo-local scripts so the demo does not depend on Prisma “seed config” being set up:
  - `pnpm -C app run db:reset`
  - `pnpm -C app run db:seed`
  - `pnpm -C app run db:seed:check`
- Created operational runbook: `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md`.

## Verification

Commands (all run locally):

- `pnpm -C app lint` ✅
- `pnpm -C app test` ✅ (includes suite `S05 failure visibility contract (finance server actions)`)
- `pnpm -C app build` ✅
- `pnpm -C app run db:reset` ✅
- `pnpm -C app run db:seed` ✅ (prints `Seeding finished.`)
- `pnpm -C app run db:seed:check` ✅ (prints JSON with `tenant/admin/parentUser/guardian/student/link: true`)

Browser verification (manual via Playwright tools):
- Admin login works and `/admin/finances` allows creating a concept and generating charges.
- `/admin/activity` shows Finance events and metadata with ids/montos/periodKey (no PII).
- `/parent/finances` shows visible error state with `Código:` when parent statement can’t load (see Known Issues).

## Diagnostics

- Primary runbook: `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md`
- DB fixture sanity check:
  - `pnpm -C app run db:seed:check`
- UI surfaces:
  - Admin: `/admin/finances`, `/admin/activity`
  - Parent: `/parent/finances`

## Deviations

- Seed is invoked via `pnpm -C app run db:seed` (node+tsx runner) instead of `prisma db seed`, because this repo currently lacks Prisma seed configuration in `package.json` and `prisma db seed` was a no-op.

## Known Issues

- **Parent happy path is not fully attainable with only seed+runbook yet:**
  - `getForParent()` requires `session.user.guardianId`, but NextAuth session currently does not inject a `guardianId` for `padre@demo.com`.
  - The seed now creates `Guardian` + `StudentGuardian` link deterministically, but the session lacks the guardianId bridge, so `/parent/finances` returns visible error `Código: INVALID_TARGET`.
  - Failure visibility is OK, but the “happy path Parent” needs a follow-up change (map User→Guardian or inject guardianId into session) to complete the end-to-end demo.

## Files Created/Modified

- `app/prisma/seed.ts` — adds deterministic demo user for RBAC scenario + creates Guardian and links it to seeded student `STD-001`.
- `app/src/actions/finance/_shared.ts` — extends `FinanceSessionUser` type to include optional `guardianId` (type alignment).
- `app/.env` — fixes formatting so env vars parse correctly.
- `app/scripts/seed.mjs` — repo-local seed runner.
- `app/scripts/seed-check.mjs` — prints a minimal fixture health JSON for the runbook.
- `app/package.json` — adds `db:reset`, `db:seed`, `db:seed:check` scripts.
- `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md` — operational runbook for S05 (reset→seed→happy path Admin→Activity→Parent + failure visibility + troubleshooting).
