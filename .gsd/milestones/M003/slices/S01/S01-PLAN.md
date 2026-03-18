# S01: Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin

**Goal:** Introducir un ledger mínimo en DB (Conceptos + Cargos) y exponer una UI Admin/Director para crear conceptos y generar cargos mensuales **idempotentes** (sin duplicados por periodo), con tenant-scope derivado de sesión y RBAC.
**Demo:** Como Admin/Director, entro a `/admin/finances`, creo un concepto mensual (p.ej. “Colegiatura”), selecciono un periodo `YYYY-MM` y genero cargos para alumnos; al reintentar generar el mismo periodo, **no aparecen cargos duplicados** y la UI muestra cuántos se crearon vs ya existían.

## Must-Haves

- Modelos Prisma tenant-scoped: `FinanceConcept` y `FinanceCharge` con dedupe de recurrencia mensual basado en `periodKey`.
- Server Actions endurecidas:
  - Conceptos: crear/listar (y update opcional si cabe sin sobre-scope).
  - Cargos: generar para periodo (idempotente) + listar para UI.
- Tenant-scope derivado de sesión (`auth()` → `session.user.tenantSlug` → `tenantId`) y RBAC `admin|director`.
- Errores estables para finanzas (códigos nuevos en `STABLE_ERROR`) y UX mínima de fallos (mensaje visible en UI).
- UI Admin mínima (antd + DashboardLayout): tabs Conceptos / Cargos con tabla y acción “Generar”.

## Proof Level

- This slice proves: integration
- Real runtime required: yes (smoke manual en dev para UI admin)
- Human/UAT required: yes (verificación visual simple: tablas + no-duplicados)

## Verification

- `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts` (suite contract; tsx --test uses file path filters):
  - `app/src/actions/__tests__/finance.actions.test.ts` — asserts: tenant-scope, RBAC, y dedupe idempotente por `@@unique([... periodKey])`.
- `pnpm -C app lint`
- `pnpm -C app build`
- Manual smoke (dev):
  1) `pnpm -C app dev`
  2) Login como admin/director
  3) `/admin/finances` → crear concepto mensual → generar cargos `YYYY-MM` → reintentar → tabla no duplica

## Observability / Diagnostics

- Runtime signals: errores estables `STABLE_ERROR.*` en respuestas de actions; conteo `{created, skipped}` devuelto por `generateForPeriod`.
- Inspection surfaces:
  - UI Admin `/admin/finances` (tab Cargos muestra resultados y permite refresh)
  - DB: tablas `FinanceConcept`, `FinanceCharge` (via Prisma Studio o queries)
  - Tests: `finance.actions.test.ts` como contrato reproducible
- Failure visibility:
  - UI muestra mensaje con `stableError.code`
  - Tests fallan con asserts específicos (RBAC/tenant/dedupe)
- Redaction constraints: no loggear PII (nombre completo de alumnos) en metadata/errores; sólo IDs y montos.

## Integration Closure

- Upstream surfaces consumed: `auth()` (NextAuth), `prisma` (con seams), `DashboardLayout` admin, patrones de `stableError`.
- New wiring introduced in this slice:
  - Nuevos modelos Prisma + migración
  - Nuevas server actions `app/src/actions/finance/*.ts`
  - Nueva ruta UI `/admin/finances` (y opcional `/director/finances` si el routing lo requiere)
- What remains before the milestone is truly usable end-to-end:
  - S02: registrar pagos + estado de cuenta real para Parent (reemplazar mocks)
  - S03: ActivityEvent `finance.*`
  - S04: gates y suite completa de verificación

## Tasks

- [x] **T01: Definir verificación (tests) para dedupe/RBAC/tenant-scope de finanzas** `est:1h`
  - Why: Fija el contrato crítico (idempotencia + scope) antes de tocar schema/UI y evita regresiones.
  - Files: `app/src/actions/__tests__/finance.actions.test.ts`, `app/src/lib/test-seams.ts`
  - Do: Crear tests (inicialmente rojos) usando `__TEST_PRISMA__` y `__TEST_SESSION__` que validen: (1) sólo admin/director puede escribir, (2) tenant-scope no se puede cruzar, (3) generar cargos dos veces no duplica por `periodKey`.
  - Verify: `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts`
  - Done when: el archivo de test existe con asserts explícitos para RBAC/tenant/dedupe (aunque falle hasta implementar T02/T03).

- [x] **T02: Modelos Prisma y server actions de Conceptos + Cargos idempotentes** `est:2h`
  - Why: Implementa el núcleo del ledger mínimo y la idempotencia basada en esquema.
  - Files: `app/prisma/schema.prisma`, `app/prisma/migrations/*`, `app/src/actions/finance/concepts.ts`, `app/src/actions/finance/charges.ts`, `app/src/lib/errors.ts`
  - Do:
    - Agregar modelos Prisma `FinanceConcept`, `FinanceCharge` (tenantId requerido) con `periodKey` (nullable) y `@@unique([tenantId, studentId, conceptId, periodKey])`.
    - Implementar helpers internos: `getTenantIdFromSession()` + `assertFinanceWriteAccess()` que soporten `role` o `roles[]`.
    - Actions:
      - `financeConcept.create`, `financeConcept.list`
      - `financeCharge.generateForPeriod({ periodKey, conceptId, studentIds? })` devolviendo `{ createdCount, skippedCount }` y usando `createMany({ skipDuplicates:true })`.
      - `financeCharge.listByPeriod({ periodKey, conceptId? })` para UI.
    - Añadir/registrar nuevos `STABLE_ERROR` (ej. `FINANCE_FORBIDDEN`, `FINANCE_INVALID_PERIOD_KEY`, `FINANCE_CONCEPT_NOT_FOUND`).
  - Verify: `pnpm -C app test -- src/actions/__tests__/finance.actions.test.ts`
  - Done when: migración aplica y los tests pasan localmente para RBAC/tenant/dedupe.

- [x] **T03: UI Admin /admin/finances (Conceptos + Generación de Cargos) con visibilidad de errores** `est:2h`
  - Why: Cierra el loop de producto: Admin puede operar finanzas sin duplicados y con feedback usable.
  - Files: `app/src/app/admin/finances/page.tsx`, `app/src/app/admin/finances/components/*`, `app/src/actions/finance/concepts.ts`, `app/src/actions/finance/charges.ts`
  - Do:
    - Crear página con `DashboardLayout` + antd `Tabs`:
      - Tab Conceptos: form simple (nombre, tipo mensual/único, monto) + tabla de conceptos.
      - Tab Cargos: inputs (periodKey `YYYY-MM`, concepto) + botón Generar + tabla de cargos del periodo.
    - Mostrar feedback: `message.success` con `{createdCount, skippedCount}` y `message.error` con `stableError.code`.
    - Asegurar que la UI no envía tenantSlug/tenantId; sólo IDs de concepto/alumnos cuando aplique.
  - Verify: `pnpm -C app dev` + smoke manual (demo descrita) + `pnpm -C app build`
  - Done when: la pantalla funciona en runtime real y reintentar generación no duplica y muestra skippedCount>0.

## Files Likely Touched

- `app/prisma/schema.prisma`
- `app/src/lib/errors.ts`
- `app/src/actions/finance/concepts.ts`
- `app/src/actions/finance/charges.ts`
- `app/src/actions/__tests__/finance.actions.test.ts`
- `app/src/app/admin/finances/page.tsx`
- `app/src/app/admin/finances/components/*`
