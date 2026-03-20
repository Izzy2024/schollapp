---
estimated_steps: 8
estimated_files: 3
---

# T03: Emit finance.* ActivityEvents from finance server actions (idempotent + transactional)

**Slice:** S03 — Observabilidad financiera (ActivityEvent) + superficie de auditoría
**Milestone:** M003

## Description

Implement the actual audit trail: finance server actions must create `ActivityEvent` rows with namespaced actions (`finance.*`), consistent `entityType='finance'`, and minimal parse-safe metadata without PII. Preserve idempotency in charge generation and ensure payment events are created transactionally with the payment record.

## Steps

1. Identify the existing `ActivityEvent` write pattern (e.g. announcements) and replicate it for finance.
2. Update `app/src/actions/finance/concepts.ts`:
   - On create: write `ActivityEvent` with `action: 'finance.concept.created'`, `entityId: concept.id`.
   - On update: write `ActivityEvent` with `action: 'finance.concept.updated'`.
   - Metadata: `{ conceptId, amountCents, currency, cadence }` (no names).
3. Update `app/src/actions/finance/charges.ts`:
   - When creating charges for a period, emit `finance.charge.created` **only** for charges actually created.
   - Ensure re-running for the same period does not create additional events.
   - Metadata: `{ chargeId, conceptId, studentId, periodKey, amountCents, currency }`.
4. Update `app/src/actions/finance/payments.ts`:
   - Inside the same `$transaction` that creates the payment, also create `ActivityEvent` with `action: 'finance.payment.recorded'`, `entityId: payment.id`.
   - Metadata: `{ paymentId, studentId, amountCents, currency, chargeId? }`.
5. Ensure actor attribution uses session user id (`actorUserId`) and tenant is derived from session tenant (not from client input).
6. Confirm `ActivityEvent.metadata` is stored as an object (Prisma JSON) rather than double-encoded string.
7. Run T01 tests; fix any remaining mismatches with action names, entity ids, or metadata shape.
8. Optional: add a guard/utility helper in finance shared module for emitting events to reduce duplication (only if it stays within task scope).

## Must-Haves

- [ ] Each finance mutation writes an `ActivityEvent` with `entityType='finance'` and a `finance.*` action.
- [ ] `recordManual` emits the event transactionally with the payment.
- [ ] `generateForPeriod` emits events only for created charges (no duplicates on retries).
- [ ] Metadata contains only stable identifiers + amounts/period, and is parse-safe (no PII).

## Verification

- `pnpm -C app test --filter finance-activity` (or full `pnpm -C app test`) passes.
- Spot-check: query `ActivityEvent` rows for a known `chargeId`/`paymentId` and assert exactly one row per created entity.

## Observability Impact

- Signals added/changed: Persisted audit trail for finance in `ActivityEvent` with consistent taxonomy and redaction.
- How a future agent inspects this: Use Activity Feed “Finanzas” filter or query DB by `action startsWith 'finance.'`.
- Failure state exposed: Missing events indicate mutation path skipped emission; duplicate events indicate idempotency regression.

## Inputs

- `app/src/actions/finance/charges.ts` — idempotent charge creation (S01).
- `app/src/actions/finance/payments.ts` — transactional payment recording (S02).
- `app/src/actions/activity.ts` + taxonomy — feed consumption and filtering.

## Expected Output

- Finance actions emit `ActivityEvent` rows for concept/charge/payment mutations.
- T01 tests passing demonstrates end-to-end wiring: mutation → ActivityEvent persisted → feed filter returns correct items.
