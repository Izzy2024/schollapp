# S02: Registro manual de pagos + Estado de cuenta Parent (real, no mock)

**Goal:** Habilitar pagos manuales (Admin/Director) y mostrar un estado de cuenta real (Parent) calculado desde DB (cargos − pagos) con scoping por tenant derivado de sesión y RBAC.
**Demo:** Como Admin/Director registro un pago manual contra un cargo de un alumno. Luego como Parent entro a `/parent/finances` y veo el saldo real y el historial de cargos/pagos (sin mocks).

## Must-Haves

- Registrar **pago manual** persistido en DB, ligado a un `FinanceCharge` (regla determinista MVP).
- El **saldo** se calcula determinísticamente: `sum(charges.amountCents) - sum(payments.amountCents)` para los students visibles por el parent.
- `/parent/finances` existe y muestra **estado de cuenta real** (cargos + pagos + saldo) sin hardcodes.
- **Tenant-scope**: todas las queries/mutaciones financieras filtran por `tenantId` derivado de sesión (no input).
- **RBAC**: solo Admin/Director puede escribir pagos; Parent solo lectura y solo de sus students.
- **Errores estables** para casos críticos (forbidden, scope violation, charge not found, amount inválido) y UI no oculta fallos.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes (verificación visual mínima del estado de cuenta en `/parent/finances`)

## Verification

- Contract tests (seam-based; sin `mock.module`) que prueban:
  - `financePayment.recordManual` respeta tenant-scope y RBAC.
  - `financeStatement.getForParent` respeta scope del parent (solo sus students) y computa balance determinista.
  - Path de error estable para `FINANCE_CHARGE_NOT_FOUND` y/o `FINANCE_SCOPE_VIOLATION`.
  - **Archivo:** `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
- Runtime smoke:
  - `pnpm -C app dev` y navegar como Parent a `/parent/finances` sin mocks.
  - Admin registra pago (UI o acción) y Parent ve saldo actualizado tras refresh.

## Observability / Diagnostics

- Runtime signals:
  - Errores estables (`STABLE_ERROR` codes) para finanzas en acciones de pagos/estado de cuenta.
  - (Preparación) metadata mínima para futura emisión de `ActivityEvent` en S03 (no requerido que aparezca en feed aún).
- Inspection surfaces:
  - DB tables: `FinanceCharge`, `FinancePayment` (inspección vía Prisma Studio o queries en tests).
  - UI `/parent/finances` muestra estados: loading/empty/error.
- Failure visibility:
  - UI renderiza un mensaje estable por `error.code` cuando falla la carga del statement.
  - Tests asertan códigos de error esperados.
- Redaction constraints:
  - No loggear notas/comprobantes ni PII en metadata/eventos; solo IDs y montos.

## Integration Closure

- Upstream surfaces consumed:
  - `app/src/actions/finance/_shared.ts` (`getTenantIdFromSession`, `assertFinanceWriteAccess`)
  - Modelos existentes `FinanceConcept`, `FinanceCharge` (S01)
  - Relación parent↔students existente en Prisma (Guardian/Student join).
- New wiring introduced in this slice:
  - Prisma model `FinancePayment` + acciones `recordManual` y `getForParent`.
  - Nueva ruta `app/src/app/parent/finances/page.tsx` consumiendo el statement real.
  - Eliminación/reemplazo del mock financiero en `app/src/actions/parent.ts` (o redirección a `getForParent`).
- What remains before the milestone is truly usable end-to-end:
  - Emisión y visualización de `ActivityEvent` `finance.*` (S03).
  - Gates y suite completa de verificación (S04) + integración final (S05).

## Tasks

- [x] **T01: Crear pruebas de contrato (rojas) para pagos + estado de cuenta (seams, sin mock.module)** `est:45m`
  - Why: Fijar el contrato crítico de scope/RBAC + aritmética de saldo antes de tocar UI/DB; evita regresiones y guía implementación.
  - Files: `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`, `app/src/lib/errors.ts`
  - Do: Escribir tests que (1) crean tenant+usuarios+students+charges en prisma de test, (2) ejercitan `recordManual` y `getForParent`, (3) validan errores estables por scope y amount.
  - Verify: `pnpm -C app test -- payments-and-statement.actions.test.ts` (debe fallar al inicio por acciones/modelo faltante)
  - Done when: El test file existe, corre, y falla por razones esperadas (missing model/actions), dejando asserts claros.

- [x] **T02: Añadir modelo Prisma FinancePayment + migración + errores estables nuevos** `est:1h`
  - Why: Persistir pagos y soportar queries deterministas de estado de cuenta con scoping por tenant.
  - Files: `app/prisma/schema.prisma`, `app/prisma/migrations/*`, `app/src/lib/errors.ts`
  - Do: Modelar `FinancePayment` ligado a `FinanceCharge` y `Student`, con `tenantId`, `amountCents`, `paidAt`, `method`, `note?`, `attachmentId?` (si Attachment aplica). Añadir stable errors: `FINANCE_CHARGE_NOT_FOUND`, `FINANCE_PAYMENT_INVALID_AMOUNT`.
  - Verify: `pnpm -C app prisma migrate dev` (o comando equivalente del repo) y `pnpm -C app test -- payments-and-statement.actions.test.ts` (aún rojo, pero ya compila el schema)
  - Done when: Prisma genera cliente/migración sin errores y tipos incluyen `FinancePayment`.

- [x] **T03: Implementar server actions: recordManual + getForParent (tenant-scope, RBAC, determinismo)** `est:1h`
  - Why: Cerrar el backend para registrar pagos y producir el statement real consumible por UI y tests.
  - Files: `app/src/actions/finance/payments.ts`, `app/src/actions/finance/statements.ts`, `app/src/actions/finance/_shared.ts`
  - Do: Implementar `recordManual` usando `getTenantIdFromSession()` + `assertFinanceWriteAccess()`; validar amount > 0; lookup charge por `{id, tenantId}`; crear payment en transacción; computar paid/partial si aplica (opcional). Implementar `getForParent` resolviendo students del parent (por relación existente), listando charges/payments por tenant+students, y devolviendo totales deterministas.
  - Verify: `pnpm -C app test -- payments-and-statement.actions.test.ts`
  - Done when: Los tests de T01 pasan (verde) y las acciones devuelven errores estables en paths negativos.

- [ ] **T04: Construir UI Parent real en /parent/finances y remover mocks del dashboard parent** `est:1h`
  - Why: Entregar el resultado visible al usuario (Parent) y asegurar que finanzas ya no dependan de datos hardcoded.
  - Files: `app/src/app/parent/finances/page.tsx`, `app/src/actions/parent.ts`, `app/src/app/parent/page.tsx`
  - Do: Crear página `/parent/finances` que llama `financeStatement.getForParent()` y muestra por student: saldo, lista de cargos y pagos (fechas/montos). Actualizar `getParentDashboardData` para que el bloque financial provenga del statement real (o elimine secciones mock) y linkee a `/parent/finances`.
  - Verify: `pnpm -C app dev` + navegación a `/parent/finances` con un Parent sembrado; `pnpm -C app build`
  - Done when: `/parent/finances` renderiza datos reales (cero mocks) y falla con mensaje estable si la acción retorna error.

- [ ] **T05: Superficie Admin mínima para registrar pago manual contra un cargo** `est:1h`
  - Why: Completar el flujo MVP: Admin/Director puede registrar pago sin necesitar scripts/DB manual.
  - Files: `app/src/app/(admin)/finance/*` (o ruta existente de finanzas admin), `app/src/actions/finance/payments.ts`, `app/src/components/*` (si aplica)
  - Do: Añadir acción/botón “Registrar pago” en la lista de cargos (S01) que abre un form (monto, fecha, nota, método) y llama `recordManual({ chargeId, amountCents, paidAt, ... })`. Manejar errores estables en UI.
  - Verify: Runtime: registrar pago y ver que `/parent/finances` refleja el cambio tras refresh; `pnpm -C app test -- payments-and-statement.actions.test.ts`
  - Done when: Un usuario Admin/Director puede registrar un pago manual desde UI y el pago queda persistido y visible para Parent.

## Files Likely Touched

- `app/prisma/schema.prisma`
- `app/src/lib/errors.ts`
- `app/src/actions/finance/payments.ts`
- `app/src/actions/finance/statements.ts`
- `app/src/actions/parent.ts`
- `app/src/app/parent/finances/page.tsx`
- `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`
