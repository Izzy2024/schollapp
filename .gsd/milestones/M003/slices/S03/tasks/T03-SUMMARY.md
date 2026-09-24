---
id: T03
parent: S03
milestone: M003
provides:
  - Finance server actions now persist finance.* ActivityEvents (charge/payment/concept) with stable metadata and correct actor/tenant attribution
key_files:
  - app/src/actions/finance/charges.ts
  - app/src/actions/finance/payments.ts
  - app/src/actions/finance/concepts.ts
key_decisions:
  - ActivityEvent.metadata remains JSON-stringified because the Prisma schema currently defines it as String (not Json)
patterns_established:
  - Emit ActivityEvent immediately after successful creation inside the same control flow; for payments, emit inside the same $transaction as the payment write
observability_surfaces:
  - DB table ActivityEvent (query by tenantId + entityType='finance' + action startsWith 'finance.')
duration: 35m
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T03: Emit finance.* ActivityEvents from finance server actions (idempotent + transactional)

**Implemented persisted audit trail for finance mutations by emitting `ActivityEvent` rows with `entityType='finance'` and namespaced `finance.*` actions from finance server actions.**

## What Happened

- Implemented `ActivityEvent` emission for finance actions:
  - Charges: `generateForPeriod(...)` now emits `finance.charge.created` **only** when a `FinanceCharge` row is actually created (no emission on P2002 skips), preserving idempotency.
  - Payments: `recordManual(...)` now emits `finance.payment.recorded` inside the same Prisma `$transaction` as the payment create (transactional with the payment).
  - Concepts: `create(...)` emits `finance.concept.created` transactionally; added `update(...)` emitting `finance.concept.updated`.
- Ensured attribution and scoping:
  - `tenantId` and `actorUserId` come from session context (`getTenantIdFromSession()`), not client input.
- Metadata redaction + parse-safety:
  - Metadata includes only stable ids + cents/period/currency; no names/PII.
  - Stored metadata as JSON string, matching the current Prisma schema (`ActivityEvent.metadata: String?`).

## Verification

- Ran and passed the S03 contract test suite:
  - `pnpm -C app test src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`

This verifies:
- `finance.charge.created` and `finance.payment.recorded` rows are persisted with `entityType='finance'`.
- `getRecentActivities(..., 'finance', ...)` returns finance-only activities.
- Re-running `generateForPeriod` does not create duplicate `finance.charge.created` events for the same charge.

## Diagnostics

- To inspect emitted events in DB (via Prisma):
  - Query `ActivityEvent` by `tenantId` and `entityType: 'finance'`, or by `action` prefix `finance.`.
  - For idempotency checks: count `ActivityEvent` rows where `{ action: 'finance.charge.created', entityId: <chargeId> }` should be exactly 1.

## Deviations

- `ActivityEvent.metadata` was specified in the plan as Prisma JSON, but the repo schema defines it as `String? // JSON stringified`; implementation uses `JSON.stringify(...)` to match the schema.

## Known Issues

- None observed in the contract tests.

## Files Created/Modified

- `app/src/actions/finance/charges.ts` — emit `finance.charge.created` ActivityEvent only for newly created charges.
- `app/src/actions/finance/payments.ts` — emit `finance.payment.recorded` ActivityEvent transactionally with payment creation.
- `app/src/actions/finance/concepts.ts` — emit `finance.concept.created` on create; added update action emitting `finance.concept.updated`.
