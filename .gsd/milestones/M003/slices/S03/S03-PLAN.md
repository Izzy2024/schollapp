# S03: Observabilidad financiera (ActivityEvent) + superficie de auditoría

**Goal:** Emitir `ActivityEvent` para mutaciones financieras (`finance.*`) y hacerlas visibles/filtrables en el Activity Feed con metadata mínima parse-safe (sin PII), habilitando diagnóstico post-lanzamiento.
**Demo:** Un Admin/Director genera cargos y registra un pago manual; al ir a la pantalla de Activity Feed del tenant se ven eventos tipo “Finanzas” con acciones `finance.charge.created` y `finance.payment.recorded`, con metadata (ids + centavos + periodKey) parseada sin romper UI.

## Must-Haves

- `ActivityEntityType` incluye `finance` con label/icon y filtro funcional (por `entityType` o `actionPrefix`).
- Server Actions de mutación financiera emiten eventos `finance.*` con `entityType='finance'`, `entityId` correcto y `metadata` JSON parse-safe sin PII.
- Idempotencia preservada: reintentar `generateForPeriod` no duplica eventos (solo se emite por cargos realmente creados).
- Activity Feed renderiza copy/iconos coherentes para finanzas y no revienta ante metadata inesperada.
- Verificación automatizada cubre: (1) creación de cargo → evento `finance.charge.created` (2) registro de pago → evento `finance.payment.recorded` (3) filtro `finance` en feed devuelve solo finanzas.

## Proof Level

- This slice proves: contract + integration (server actions → persisted ActivityEvent → feed query/render)
- Real runtime required: no (tests + DB in-process)
- Human/UAT required: no (opcional smoke manual en S05)

## Verification

- `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts` (node:test) — asserts: taxonomy includes finance; generating charges creates finance events once; recording payment creates finance event; feed filter returns them.
- `pnpm -C app test --filter finance-activity` (or equivalent test command used by repo) passes.

## Observability / Diagnostics

- Runtime signals: Persisted `ActivityEvent` rows with `action` namespaced (`finance.*`) and stable metadata.
- Inspection surfaces: DB table `ActivityEvent` (via Prisma) + `getRecentActivities()` feed action + filter options from `getActivityFilterOptions()`.
- Failure visibility: missing/duplicated events detectable by querying `ActivityEvent` count for specific `entityId` + action; metadata parsing fallback ensures feed still renders.
- Redaction constraints: No PII in metadata (no names, emails); only ids, cents, periodKey, currency, conceptId/chargeId/paymentId.

## Integration Closure

- Upstream surfaces consumed: finance actions (`app/src/actions/finance/charges.ts`, `.../payments.ts`, `.../concepts.ts`), activity feed action (`app/src/actions/activity.ts`), taxonomy + metadata parser (`app/src/lib/activity-taxonomy.ts`, `app/src/lib/activity-metadata.ts`).
- New wiring introduced in this slice: `finance` taxonomy entry + event emission inside finance mutations (transactional where applicable).
- What remains before the milestone is truly usable end-to-end: S04 adds broader tests + gates; S05 does runtime happy-path walkthrough + failure visibility.

## Tasks

- [x] **T01: Add failing contract tests for finance ActivityEvents + feed filter** `est:45m`
  - Why: Lock slice stopping condition first (R006 for finance) and prevent regressions in idempotency + filtering.
  - Files: `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`, `app/src/lib/test-seams.ts` (consume seams), `app/src/actions/finance/__tests__/` fixtures if needed
  - Do: Create node:test suite using `__TEST_PRISMA__`/`__TEST_SESSION__` seams; arrange minimal tenant+users+student+concept; call finance actions; assert `ActivityEvent` rows and `getRecentActivities(filter='finance')` output.
  - Verify: `pnpm -C app test --filter finance-activity` (or run full `pnpm -C app test` if no filter)
  - Done when: Test file exists and fails for the right reason (no finance taxonomy/events yet).

- [x] **T02: Extend activity taxonomy + feed copy/icons for finance** `est:45m`
  - Why: Make finance filter and rendering coherent; required for visibility and operator UX.
  - Files: `app/src/lib/activity-taxonomy.ts`, `app/src/actions/activity.ts`
  - Do: Add `finance` to `ACTIVITY_ENTITY_TYPES`, aliases, and `ACTIVITY_TAXONOMY` (label “Finanzas”, icon e.g. `paid`); update `getRecentActivities()` display mapping for `normalizedEntity === 'finance'` to produce stable text for `finance.concept.*`, `finance.charge.*`, `finance.payment.*`.
  - Verify: Run T01 tests; `getActivityFilterOptions()` includes Finanzas and `getRecentActivities(...,'finance')` doesn’t fallback to announcement.
  - Done when: Finance shows as a first-class filter/entity type and feed text/icon are non-generic.

- [x] **T03: Emit finance.* ActivityEvents from finance server actions (idempotent + transactional)** `est:1h`
  - Why: Close the actual observability gap: mutations must produce audit trail rows.
  - Files: `app/src/actions/finance/charges.ts`, `app/src/actions/finance/payments.ts`, `app/src/actions/finance/concepts.ts` (if create/update exists), `app/prisma/schema.prisma` (only if needed; prefer no schema change)
  - Do: In each mutation, create `ActivityEvent` with `{ tenantId, actorUserId, action, entityType:'finance', entityId, occurredAt, metadata }`. Ensure:
    - `generateForPeriod`: emit only for created charges (not skipped); if current action uses `createMany`/upsert, capture created IDs deterministically (may require per-row create in tx or post-query by unique key) while keeping performance acceptable for MVP.
    - `recordManual`: emit in the same `$transaction` as payment creation; metadata includes `{ paymentId, studentId, amountCents, currency, chargeId? }`.
    - `concept.create/update`: emit `finance.concept.created|updated` with `{ conceptId, amountCents, cadence }`.
  - Verify: T01 tests pass; confirm no duplicate events on re-run of generate.
  - Done when: Tests demonstrate events are written exactly once per real creation and feed filter returns them.

## Files Likely Touched

- `app/src/lib/activity-taxonomy.ts`
- `app/src/actions/activity.ts`
- `app/src/actions/finance/charges.ts`
- `app/src/actions/finance/payments.ts`
- `app/src/actions/finance/concepts.ts`
- `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`
