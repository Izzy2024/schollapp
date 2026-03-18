---
id: T03
parent: S05
milestone: M002
provides:
  - Rutas director (/director/activity, /director/overview) conectadas a wrappers RBAC+tenant con KPIs y feed tenant-scoped.
key_files:
  - app/src/actions/directorActivity.ts
  - app/src/actions/directorOverview.ts
  - app/src/app/director/activity/page.tsx
  - app/src/app/director/overview/page.tsx
  - app/src/actions/admin.ts
  - app/src/lib/test-seams.ts
key_decisions:
  - Se introdujo un seam de test via globals (__TEST_SESSION__/__TEST_PRISMA__) para reemplazar node:test mock.module (no soportado bajo tsx --test en este repo).
patterns_established:
  - Wrappers director validan rol con error code estable STABLE_ERROR.UNAUTHORIZED_ROLE y fuerzan tenantSlug de sesión (ignoran parámetro externo).
observability_surfaces:
  - Errores estables via STABLE_ERROR + stableError("UNAUTHORIZED_ROLE")
  - Test seams: globalThis.__TEST_SESSION__ y globalThis.__TEST_PRISMA__ (solo tests)
duration: 1h35m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Conectar superficies director de Activity + Overview con wrappers RBAC/tenant

**Se habilitó la experiencia director de S05 conectando Activity + Overview a wrappers server-side con guardas RBAC y aislamiento por tenant, y se alinearon KPIs a contrato (ventana UTC + pendingBreakdown).**

## What Happened

- Se confirmó que ya existían páginas `/director/activity` y `/director/overview` consumiendo wrappers (`getDirectorRecentActivities`, `getDirectorOverviewStats`) y opciones de filtro canónicas.
- Se reforzó la capa server-side para que las acciones consumidas por director y los KPIs del overview cumplan:
  - rol DIRECTOR obligatorio con error estable `UNAUTHORIZED_ROLE`.
  - scope por tenant usando `session.user.tenantSlug` (ignorando cualquier `tenantSlug` externo).
- Se alineó `getAdminDashboardStats()` al contrato de KPIs de S05:
  - ventana diaria **UTC** (`T00:00:00.000Z` a `T23:59:59.999Z`).
  - `pendingBreakdown` con shape estable y `scopeTenantId`.
- Se corrigió el harness de tests del slice (T01) ya que `node:test mock.module` no está disponible bajo `tsx --test` en este repo:
  - Se agregó seam de test (`app/src/lib/test-seams.ts`) y se consumió desde `auth` y acciones relevantes.
  - Se migraron suites S05 para usar `globalThis.__TEST_SESSION__` y `globalThis.__TEST_PRISMA__`.

## Verification

Se ejecutaron y pasaron en verde:

- `cd app && pnpm test -- src/test/actions/overview-kpis.integration.test.ts src/test/routes/director-overview-activity.rbac.test.tsx`
- `cd app && pnpm test -- src/test/actions/activity-feed.contract.test.ts`
- `cd app && pnpm test -- src/test/actions/activity-feed.contract.test.ts src/test/actions/overview-kpis.integration.test.ts src/test/routes/director-overview-activity.rbac.test.tsx`

## Diagnostics

- RBAC director: wrappers lanzan `Error("UNAUTHORIZED_ROLE")` (stable) cuando `session.user.role !== "DIRECTOR"`.
- Tenant isolation: wrappers fuerzan `tenantSlug` desde sesión; los tests cubren explícitamente el caso de slug externo.
- Test harness: los contratos S05 pueden inyectar sesión/prisma sin depender de `mock.module`:
  - `globalThis.__TEST_SESSION__ = { user: { ... } }`
  - `globalThis.__TEST_PRISMA__ = { tenant: { findUnique }, ... }`

## Deviations

- Se cambió el enfoque de mocking en tests: se reemplazó `mock.module()` por seams controlados (globals) para compatibilidad con `tsx --test`.

## Known Issues

- Ninguno identificado en el alcance de S05/T03.

## Files Created/Modified

- `app/package.json` — script `test` normalizado a `tsx --test` para permitir pasar rutas (pnpm test -- <files>).
- `app/src/lib/test-seams.ts` — helper para leer seams de test (sesión/prisma).
- `app/src/auth.ts` — export `auth()` ahora soporta override de sesión en tests (sin afectar runtime normal).
- `app/src/lib/prisma.ts` — soporte de prisma mock en tests vía seam.
- `app/src/actions/activity.ts` — usa prisma seam en tests (sin cambiar el comportamiento tenant-scoped).
- `app/src/actions/admin.ts` — ventana diaria UTC + `pendingBreakdown` y soporte de prisma seam.
- `app/src/actions/directorOverview.ts` — usa prisma seam consistentemente.
- `app/src/actions/directorStats.ts` — usa prisma seam consistentemente.
- `app/src/test/actions/activity-feed.contract.test.ts` — migrado a seam (sin mock.module).
- `app/src/test/actions/overview-kpis.integration.test.ts` — migrado a seam.
- `app/src/test/routes/director-overview-activity.rbac.test.tsx` — migrado a seam y apunta a wrappers director.
