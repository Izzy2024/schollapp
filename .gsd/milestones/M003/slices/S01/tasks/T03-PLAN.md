---
estimated_steps: 7
estimated_files: 5
---

# T03: UI Admin /admin/finances (Conceptos + Generación de Cargos) con visibilidad de errores

**Slice:** S01 — Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin
**Milestone:** M003

## Description

Crear una superficie admin mínima (Next.js App Router + antd + DashboardLayout) para operar conceptos y cargos reales desde DB: crear conceptos y generar cargos por periodo con feedback visible y sin duplicación al reintentar.

## Steps

1. Crear ruta `app/src/app/admin/finances/page.tsx` usando `DashboardLayout` y antd `Tabs`.
2. Implementar Tab “Conceptos”:
   - Form (name, kind monthly|one_time, amountCents, currency)
   - Submit llama `financeConcept.create`
   - Tabla lista conceptos vía `financeConcept.list`
3. Implementar Tab “Cargos”:
   - Inputs: `periodKey` (`YYYY-MM`), `conceptId`
   - Botón “Generar cargos” llama `financeCharge.generateForPeriod`
   - Mostrar `message.success` con created/skipped
   - Tabla lista cargos vía `financeCharge.listByPeriod`
4. Manejo de errores: si action retorna `stableError`, mostrar `message.error` con `code` (y texto breve) sin ocultar el código.
5. Validación ligera cliente: placeholder/regex simple para periodKey (sin confiar en ello; server valida).
6. Verificar RBAC: si el usuario no es admin/director, mostrar estado “No autorizado” (o manejar el error al intentar).
7. Smoke manual en dev para demostrar idempotencia (reintentar no duplica y reporta skipped).

## Must-Haves

- [ ] UI usa actions reales y no contiene mocks/fixtures.
- [ ] Reintentar “Generar” para el mismo periodo no crea duplicados y muestra `skippedCount>0`.
- [ ] Errores estables se muestran en UI (incluyendo `stableError.code`).

## Verification

- `pnpm -C app build`
- Manual: `pnpm -C app dev` → login admin/director → `/admin/finances` → demo descrita en S01-PLAN.

## Observability Impact

- Signals added/changed: UI muestra `stableError.code` + conteos created/skipped.
- How a future agent inspects this: reproducir en `/admin/finances` y revisar consola de Next + tabla en UI.
- Failure state exposed: mensajes visibles al usuario (no falla silenciosa) con código estable.

## Inputs

- `app/src/actions/finance/concepts.ts` y `app/src/actions/finance/charges.ts` — acciones de T02.
- `DashboardLayout` + patrones antd existentes en rutas admin.

## Expected Output

- `app/src/app/admin/finances/page.tsx` + componentes auxiliares en `app/src/app/admin/finances/components/*`.
- UI funcional conectada a DB y acciones (conceptos + cargos).
