---
status: done
milestone: M003
slice: S05
started_at: 2026-03-23T15:00:00-05:00
completed_at: 2026-03-24T15:50:00-05:00
verification:
  - pnpm -C app lint: pass
  - pnpm -C app test: pass
  - pnpm -C app build: pass
  - runtime_smoke:
      dev_server: pnpm -C app dev (http://localhost:3000)
      admin_finances: verified (concept created)
      admin_activity: verified (1 finance.* event visible)
      parent_finances: verified (parent role now loads statement; empty state if no charges/payments)
notes:
  - IMPORTANT: If the DB hasn't been seeded, login fails with NextAuth CallbackRouteError caused by "Usuario no encontrado o inactivo". Run db:seed.
  - Parent statement previously failed with Código: UNAUTHORIZED_ROLE because seed did not create Role/UserRole rows. Fixed by seeding roles for tenant + linking parent user.
  - Parent statement resolves Guardian by session email when guardianId is absent (dev-only bridge).
---

# S05 Summary — Integración final “Lanzamiento” (happy path + failure visibility)

## What was verified (end-to-end)

### Gates
- `pnpm -C app lint` ✅
- `pnpm -C app test` ✅
- `pnpm -C app build` ✅

### Runtime smoke (manual)
Environment:
- Dev server: `pnpm -C app dev` → `http://localhost:3000`
- Seed (required before login):
  - `pnpm -C app run db:seed`

Admin happy path:
1. Login: `/login` → `admin@demo.com` / `demo-hash-123` ✅ redirects to `/admin`
2. `/admin/finances`
   - Concept created: `Colegiatura` (`monthly`, `MXN`, `$1,200.00`) ✅
   - Charges generated for period `2026-03` ✅
     - DB evidence: `FinanceCharge.count()` → **60**
3. `/admin/activity`
   - Verified finance events visible in UI (Bitácora Global) ✅
     - Example: “Administrador Principal Generó un cargo”
   - DB evidence: `ActivityEvent` with `action` starting `finance.` → **61**
   - Metadata shown as parse-safe key/values (ids, periodKey, amountCents, currency) and no obvious PII in metadata ✅

Parent path:
1. Login: `/login` → `padre@demo.com` / `demo-hash-123` ✅ redirects to `/parent`
2. `/parent/finances`
   - Statement loads ✅
   - Summary shows real totals ✅ (post-charge generation):
     - `CARGOS: $1,200.00`
     - `PAGOS: $0.00`
     - `SALDO: $1,200.00`

## Change log
- `app/src/actions/finance/statements.ts`
  - Hardened `getForParent()` to resolve `guardianId` by `ctx.user.email` when `guardianId` is missing from the NextAuth session.
  - This unblocks the deterministic seed demo without requiring NextAuth session enrichment.
- Dev data fix: demo roles + parent role assignment
  - The seed did not create any `Role` / `UserRole` rows, which caused parent sessions to fail with `Código: UNAUTHORIZED_ROLE`.
  - Added tenant-scoped roles (`admin`, `director`, `teacher`, `student`, `parent`) and linked them to demo users so RBAC behaves deterministically.

## Known sharp edges / follow-ups
- Demo login can fail with `CallbackRouteError` → “Usuario no encontrado o inactivo” when the DB has not been seeded yet. The runbook should always start with `db:reset` + `db:seed`.
- There is still no dedicated “Parent” quick-login button on `/login` (only Admin/Director/Profesor/Estudiante). Parent access is currently best tested by navigating directly to `/parent/finances` after authenticating as a parent user.
