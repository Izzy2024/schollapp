---
estimated_steps: 8
estimated_files: 6
---

# T02: Modelos Prisma y server actions de Conceptos + Cargos idempotentes

**Slice:** S01 — Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin
**Milestone:** M003

## Description

Implementar el núcleo del ledger mínimo: modelos Prisma tenant-scoped para conceptos y cargos, restricción única para dedupe mensual, y server actions endurecidas para crear/listar conceptos y generar/listar cargos por periodo. Incluye validación de `periodKey` y errores estables.

## Steps

1. Actualizar `app/prisma/schema.prisma` agregando:
   - `FinanceConcept` (tenantId, name, kind monthly|one_time, amountCents, currency, isActive, timestamps)
   - `FinanceCharge` (tenantId, studentId, conceptId, amountCents, currency, status, dueDate?, periodKey?, timestamps)
   - `@@unique([tenantId, studentId, conceptId, periodKey])` (periodKey nullable; usado para monthly)
2. Crear migración Prisma y verificar que aplica en SQLite.
3. Ampliar `app/src/lib/errors.ts` con códigos estables para finanzas (mínimo: forbidden, invalid periodKey, concept not found/scope).
4. Crear `app/src/actions/finance/_shared.ts` con:
   - `getTenantIdFromSession()` (auth → tenantSlug → prisma.tenant)
   - `assertFinanceWriteAccess(session.user)` soportando `role` y/o `roles[]`
   - `normalizeAndValidatePeriodKey(input)` con regex `^\d{4}-\d{2}$`
5. Implementar `app/src/actions/finance/concepts.ts`:
   - `create({ name, kind, amountCents, currency })`
   - `list()` (sólo del tenant)
6. Implementar `app/src/actions/finance/charges.ts`:
   - `generateForPeriod({ periodKey, conceptId, studentIds? })`:
     - valida periodKey
     - carga concepto (scoped)
     - resuelve estudiantes del tenant (si no hay studentIds, todos activos)
     - `createMany({ skipDuplicates:true })` con filas `(tenantId, studentId, conceptId, periodKey, amountCents, currency, status)`
     - devuelve `{ createdCount, skippedCount }`
   - `listByPeriod({ periodKey, conceptId? })`
7. Asegurar que ninguna action acepta `tenantId/tenantSlug` desde input; siempre desde sesión.
8. Correr tests de T01 y ajustar contratos (errores/return shape) hasta verde.

## Must-Haves

- [ ] `@@unique([tenantId, studentId, conceptId, periodKey])` existe y dedupe funciona al reintentar.
- [ ] Actions hacen tenant-scope por sesión y aplican RBAC admin|director.
- [ ] `generateForPeriod` valida `periodKey` y retorna conteo created/skipped.

## Verification

- `pnpm -C app test -- finance.s01`
- `pnpm -C app lint` (smoke)

## Observability Impact

- Signals added/changed: errores estables `FINANCE_*` y retorno `{ createdCount, skippedCount }` para diagnóstico en UI.
- How a future agent inspects this: rerun tests y/o consultar tablas `FinanceConcept`/`FinanceCharge`.
- Failure state exposed: códigos de error deterministas para RBAC/scope/periodKey inválido.

## Inputs

- `app/prisma/schema.prisma` — esquema actual con Tenant/Student.
- `app/src/actions/announcements.ts` — patrón de hardening (auth + scope + stableError).

## Expected Output

- `app/prisma/schema.prisma` + migración aplicada.
- `app/src/actions/finance/concepts.ts`, `app/src/actions/finance/charges.ts`, `app/src/actions/finance/_shared.ts`.
- `app/src/lib/errors.ts` con nuevos códigos `FINANCE_*`.
