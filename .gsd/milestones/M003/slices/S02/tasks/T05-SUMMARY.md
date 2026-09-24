---
task: T05
slice: S02
milestone: M003
status: done
blocker_discovered: false
created_at: 2026-03-20
---

# T05 — Superficie Admin mínima para registrar pago manual contra un cargo

## What I built
- Added a minimal **Admin finances UI action** to record a manual payment against an existing charge.
- Implemented a modal form (amount, paidAt, method, note) that calls the existing server action `recordManual`.
- Ensured **error paths are visible** in the UI by surfacing stable error codes via existing `stableErrorUi` helpers.

## Files changed
- `app/src/app/admin/finances/components/ChargesTab.tsx`
  - Added an **“Acciones”** column with a **“Registrar pago”** button per charge.
  - Wired up modal open/close state and refresh after successful record.
- `app/src/app/admin/finances/components/RecordPaymentModal.tsx` (new)
  - AntD `Modal` + `Form` that submits to `financePayments.recordManual({ chargeId, amountCents, paidAt, method, note })`.
  - Loading/success/error handling:
    - success: toast + closes modal + refresh charges list
    - error: shows stable `error.code` when available

## UX / Behavior
- Admin/Director can click **Registrar pago** on a charge row.
- Form fields:
  - `Monto` (decimal input; converted to cents)
  - `Fecha de pago` (date)
  - `Método` (cash/transfer/card/manual)
  - `Nota` (optional)
- On submit:
  - disables via AntD form submit (server action call)
  - shows toast on success
  - table refreshes via `refreshCharges()`
- Failure visibility:
  - stable codes (e.g. `FINANCE_CHARGE_NOT_FOUND`, `FINANCE_PAYMENT_INVALID_AMOUNT`) are shown via `message.error(code)`.

## Verification
### Automated
- ✅ `pnpm -C app test -- src/actions/finance/__tests__/payments-and-statement.actions.test.ts`

### Runtime smoke (partial)
- Started dev server and logged in as Admin (required seeding).
- Confirmed `/admin/finances` loads and Charges tab shows the new **Acciones** column.

Note: In the seeded demo DB, the **Conceptos/Cargos** tables were empty in this runtime session, so I could not click a real charge row to submit a payment via UI. Contract tests already cover `recordManual` and statement math deterministically.

## Diagnostics / Observability
- UI now surfaces stable finance error codes on mutation failure (no silent failures).
- The modal uses the same stable error extraction helpers as the existing charges/concepts UI.

## Follow-ups (non-blocking)
- Consider adjusting the seed data to include at least one concept + student + charge so the full Admin→Parent runtime demo can be exercised without manual DB setup.
- AntD warns that `destroyOnClose` is deprecated; can switch to `destroyOnHidden` later.
