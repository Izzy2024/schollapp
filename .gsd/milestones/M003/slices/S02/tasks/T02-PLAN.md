---
estimated_steps: 6
estimated_files: 3
---

# T02: Añadir modelo Prisma FinancePayment + migración + errores estables nuevos

**Slice:** S02 — Registro manual de pagos + Estado de cuenta Parent (real, no mock)
**Milestone:** M003

## Description

Extender el schema Prisma para persistir pagos manuales de forma tenant-scoped y ligados a cargos (MVP determinista). Añadir códigos de error estables necesarios para cubrir los paths negativos del contrato.

## Steps

1. Editar `app/prisma/schema.prisma` para agregar `model FinancePayment` con:
   - `id`, `tenantId`, `studentId`, `chargeId` (requerido en MVP), `amountCents`, `currency`, `paidAt`, `method`, `note?`, `reference?`, `attachmentId?`, `createdById`, `createdAt`.
2. Definir relaciones: `FinancePayment` → `FinanceCharge` y → `Student` (y opcionalmente → `Attachment` si el modelo es reusable sin cambios mayores).
3. Agregar índices/uniques razonables (ej: `@@index([tenantId, studentId, paidAt])`, `@@index([tenantId, chargeId])`).
4. Correr migración en el flujo del repo (SQLite) para generar `app/prisma/migrations/*`.
5. Actualizar `app/src/lib/errors.ts` con nuevos códigos estables usados en tests: `FINANCE_CHARGE_NOT_FOUND`, `FINANCE_PAYMENT_INVALID_AMOUNT` (y/o `FINANCE_PAYMENT_FORBIDDEN` si se decide separar).
6. Asegurar que `pnpm -C app prisma generate` (si aplica) produce tipos con `FinancePayment`.

## Must-Haves

- [ ] `FinancePayment` queda tenant-scoped y ligado a `FinanceCharge` (MVP determinista).
- [ ] Los códigos de error estables nuevos existen y siguen el patrón del repo.

## Verification

- Ejecutar migración/generate según scripts del repo (p.ej. `pnpm -C app prisma migrate dev`).
- `pnpm -C app test -- payments-and-statement.actions.test.ts` (puede seguir rojo, pero debe compilar con el schema actualizado).

## Observability Impact

- Signals added/changed: Nuevos códigos estables para diagnosticar errores de pago.
- How a future agent inspects this: inspección directa de tabla `FinancePayment` y sus FKs/índices.
- Failure state exposed: Prisma errors (migración) + códigos estables en runtime.

## Inputs

- `app/prisma/schema.prisma` — modelos existentes `FinanceCharge`, `Student`, `Tenant`, `Attachment` (si aplica).
- `app/src/lib/errors.ts` — registro actual de `STABLE_ERROR`.

## Expected Output

- `app/prisma/schema.prisma` — incluye `FinancePayment`.
- `app/prisma/migrations/*` — migración generada.
- `app/src/lib/errors.ts` — nuevos códigos de error estable para pagos.
