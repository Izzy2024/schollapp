---
estimated_steps: 6
estimated_files: 2
---

# T01: Crear pruebas de contrato (rojas) para pagos + estado de cuenta (seams, sin mock.module)

**Slice:** S02 — Registro manual de pagos + Estado de cuenta Parent (real, no mock)
**Milestone:** M003

## Description

Crear primero una suite de contrato en rojo que fije los invariantes de S02: tenant-scope desde sesión, RBAC, regla determinista de saldo (cargos − pagos) y errores estables. Estas pruebas guiarán el diseño del modelo `FinancePayment` y las acciones `recordManual`/`getForParent`.

## Steps

1. Crear `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts` usando `node:test` y los seams `__TEST_PRISMA__`/`__TEST_SESSION__` (patrón del repo).
2. Seed mínimo en prisma de test: 2 tenants, 1 admin, 1 parent, 2 students (uno del parent, otro ajeno), 1 concepto/cargo para el student del parent.
3. Escribir caso: Admin registra pago manual en un charge del mismo tenant → payment creado; balance esperado cambia correctamente.
4. Escribir caso: Admin intenta registrar pago en charge de otro tenant → error estable `FINANCE_SCOPE_VIOLATION` o `FINANCE_CHARGE_NOT_FOUND` (según contrato definido), pero debe ser estable y no filtrar datos.
5. Escribir caso: Parent llama `getForParent` y solo ve students asociados; no debe ver charges/payments del student ajeno.
6. Escribir caso: amount inválido (<=0) → error estable `FINANCE_PAYMENT_INVALID_AMOUNT`.

## Must-Haves

- [ ] Test usa seams (sin `mock.module`) y corre en el runner del repo.
- [ ] Aserciones cubren: tenant-scope, RBAC escritura, scope parent, y aritmética de balance.

## Verification

- `pnpm -C app test -- payments-and-statement.actions.test.ts` (debe fallar inicialmente por falta de modelo/acciones, pero el archivo debe ejecutar y reportar asserts)
- Confirmar que el output de fallo es interpretable (no timeouts/infra failure).

## Observability Impact

- Signals added/changed: Contratos de error estable esperados (`FINANCE_*`) explicitados en asserts.
- How a future agent inspects this: correr el test específico para localizar si falló RBAC, scoping o aritmética.
- Failure state exposed: mensajes de assert y códigos de error esperados en paths negativos.

## Inputs

- `app/src/actions/finance/_shared.ts` — helpers de tenant/rbac ya existentes.
- `.gsd/milestones/M003/slices/S02/S02-RESEARCH.md` — regla MVP: pago ligado a charge.

## Expected Output

- `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts` — suite en rojo que define el contrato de pagos + statement.
- `app/src/lib/errors.ts` — (si hace falta en el contrato) referencia a nuevos códigos a implementar en T02.
