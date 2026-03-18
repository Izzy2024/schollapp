---
id: T01
slice: S02
milestone: M003
title: "Crear pruebas de contrato (rojas) para pagos + estado de cuenta (seams, sin mock.module)"
status: done
blocker_discovered: false
date: 2026-03-18
---

## What I did

- Creé la suite de contrato (en rojo) para S02 en:
  - `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
- La suite usa `node:test` + seams del repo:
  - `globalThis.__TEST_SESSION__`
  - `globalThis.__TEST_PRISMA__` (a través de `@/lib/prisma`)
- Definí invariantes contractuales para:
  - Tenant-scope desde sesión
  - RBAC (admin/director escribe; parent lee)
  - Regla determinista de balance: `sum(charges) - sum(payments)`
  - Errores estables esperados en paths negativos
- Extendí `STABLE_ERROR` para incluir códigos que se implementarán en T02/T03:
  - `FINANCE_CHARGE_NOT_FOUND`
  - `FINANCE_PAYMENT_INVALID_AMOUNT`

## Files changed

- Added: `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
- Updated: `app/src/lib/errors.ts`

## Contract / assertions encoded

1. **Admin registra pago manual** sobre un `FinanceCharge` del mismo tenant:
   - `recordManual({ chargeId, amountCents, paidAt })` retorna payment creado.
   - `getForParent()` (como parent) retorna solo sus students.
   - Totales por student:
     - `chargesCents = 10000`
     - `paymentsCents = 2500`
     - `balanceDueCents = 7500`

2. **Tenant-scope**: admin de tenant A intenta pagar un charge de tenant B:
   - Debe fallar con error estable **sin filtrar datos**:
     - `FINANCE_SCOPE_VIOLATION` **o** `FINANCE_CHARGE_NOT_FOUND` (contrato permite cualquiera pero exige estabilidad).

3. **Parent-scope**: `getForParent()` solo incluye students asociados vía `StudentGuardian`:
   - No debe incluir cargos/pagos de otro student del mismo tenant pero no asociado.

4. **Validación amount**: `amountCents <= 0`:
   - Debe fallar con `FINANCE_PAYMENT_INVALID_AMOUNT`.

## Verification

- Ejecutado:
  - `pnpm -C app test -- src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
- Resultado esperado (ROJO, interpretable):
  - Falla por `ERR_MODULE_NOT_FOUND` al importar `app/src/actions/finance/payments` y `statements`.
  - No hubo timeouts/infra failures.

## Notes for T02/T03

- Los tests asumen que el parent scope se resuelve por relación Prisma existente:
  - `Guardian` + `StudentGuardian`.
- Seams: el helper `getTenantIdFromSession()` hoy busca `tenant` por `tenantSlug` (no usa `tenantId` del session). Los tests siempre setean ambos (`tenantId` + `tenantSlug`) para compatibilidad.
- El test usa `guardianId` dentro de `session.user` para que `getForParent()` pueda resolver el guardian; si el diseño final usa otro campo, habrá que ajustar el seam/lookup de forma consistente.
