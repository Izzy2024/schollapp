---
estimated_steps: 7
estimated_files: 3
---

# T03: Implementar server actions: recordManual + getForParent (tenant-scope, RBAC, determinismo)

**Slice:** S02 — Registro manual de pagos + Estado de cuenta Parent (real, no mock)
**Milestone:** M003

## Description

Implementar el backend real de S02: registrar pagos manuales ligados a cargos y producir el estado de cuenta real para Parent. Debe derivar tenant desde sesión, respetar RBAC y devolver errores estables.

## Steps

1. Crear `app/src/actions/finance/payments.ts` exportando `recordManual(input)` siguiendo el patrón de acciones del repo (auth → tenantId → RBAC → validate → prisma).
2. En `recordManual`:
   - `assertFinanceWriteAccess()`.
   - Validar `amountCents > 0` (error `FINANCE_PAYMENT_INVALID_AMOUNT`).
   - Leer el cargo con `where: { id: chargeId, tenantId }`.
   - Si no existe: error estable `FINANCE_CHARGE_NOT_FOUND` (o `FINANCE_SCOPE_VIOLATION` si el repo prefiere unificar).
   - Crear `FinancePayment` en `prisma.$transaction` (y opcionalmente: recalcular `FinanceCharge.status` si el modelo tiene status en S01).
3. Crear `app/src/actions/finance/statements.ts` exportando `getForParent()`.
4. En `getForParent`:
   - Derivar `tenantId` desde sesión.
   - Validar que el rol sea parent (o al menos camino parent); resolver el set de `studentIds` visibles por el parent desde la relación existente.
   - Consultar cargos y pagos por `{ tenantId, studentId: { in: visibleIds } }`.
   - Calcular totals deterministas por student y global.
5. Estandarizar shape de salida (DTO) para que UI pueda renderizar historial: lista de items con type `charge|payment`, fechas y montos.
6. Asegurar que los errores son `STABLE_ERROR` y no exponen PII ni IDs de otro tenant.
7. Ajustar exports/paths para que los tests de T01 puedan importar las acciones.

## Must-Haves

- [ ] `recordManual` aplica tenant-scope y RBAC; crea pago ligado a cargo del mismo tenant.
- [ ] `getForParent` solo retorna students del parent y computa balance determinista.

## Verification

- `pnpm -C app test -- payments-and-statement.actions.test.ts` (debe quedar en verde).
- Chequeo manual rápido: ejecutar una llamada local (si existe script) o Prisma Studio y confirmar que `FinancePayment` se crea con `tenantId` correcto.

## Observability Impact

- Signals added/changed: uso consistente de códigos `FINANCE_*` en acciones.
- How a future agent inspects this: correr tests; inspeccionar DB (tabla `FinancePayment`) y comparar sumatorias.
- Failure state exposed: errores estables para charge inexistente/scope violation/amount inválido.

## Inputs

- `app/src/actions/finance/_shared.ts` — tenant + RBAC.
- `app/src/lib/errors.ts` — códigos `FINANCE_*`.
- `app/prisma/schema.prisma` — modelos `FinanceCharge`, `FinancePayment`.

## Expected Output

- `app/src/actions/finance/payments.ts` — acción `recordManual`.
- `app/src/actions/finance/statements.ts` — acción `getForParent` usada por UI.
- Tests de T01 en verde.
