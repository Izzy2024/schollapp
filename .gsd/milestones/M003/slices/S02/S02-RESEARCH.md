---
id: S02
milestone: M003
slice: "Registro manual de pagos + Estado de cuenta Parent (real, no mock)"
status: research
date: 2026-03-18
owners:
  - R007
supports:
  - R001
  - R006
  - R009
---

# S02 Research — Registro manual de pagos + Estado de cuenta Parent (real, no mock)

## 0) Requirements this slice owns / supports

### Owns
- **R007 Cobranza Básica (Conceptos, Pagos, Estado de Cuenta)**
  - En S02 se completa la parte de **pagos** y **estado de cuenta real**.

### Supports
- **R001 Auth + Multi-tenant (RBAC)**
  - Lecturas/escrituras deben ser **tenant-scoped desde sesión** (no desde input) y RBAC por rol.
- **R006 Activity Log / Trazabilidad**
  - Aunque el roadmap dice que S03 formaliza eventos `finance.*`, S02 ya debe diseñar mutaciones para que sea trivial emitir `ActivityEvent` (y evitar rework).
- **R009 Estabilización/Tipado**
  - Evitar endpoints/acciones “sin contrato”, y eliminar el mock actual en parent dashboard.

## 1) Scope boundaries (what must exist after S02)

**Admin/Director**
- Puede **registrar un pago manual** (con opcional comprobante/attachment).
- El pago debe afectar el saldo de forma determinista.

**Parent/Tutor**
- Puede ver en **`/parent/finances`** un **estado de cuenta real** (cargos + pagos + saldo), sin datos mock.

**System invariants**
- Todo acceso financiero deriva `tenantId` de `auth()` (server-side) mediante patrón existente.
- RBAC: parent lectura; admin/director escritura.

## 2) Current codebase reality (evidence)

### Finance models/actions that already exist (from S01)
- Prisma ya contiene **FinanceConcept** y **FinanceCharge**:
  - `app/prisma/schema.prisma`:
    - `model FinanceConcept` (con `@@unique([tenantId, name])`)
    - `model FinanceCharge` con `periodKey` y **dedupe**: `@@unique([tenantId, studentId, conceptId, periodKey])`

- Server Actions:
  - `app/src/actions/finance/concepts.ts`: `create`, `list`.
  - `app/src/actions/finance/charges.ts`: `generateForPeriod` (idempotente por unique constraint + catch P2002), `listByPeriod`.
  - Shared helpers:
    - `app/src/actions/finance/_shared.ts`:
      - `getTenantIdFromSession()` (tenantId derivado de sesión)
      - `assertFinanceWriteAccess()` (admin/director)
      - `normalizeAndValidatePeriodKey()`.

### Parent finances are still mocked today
- `app/src/actions/parent.ts` devuelve `financial.balanceDue`, `dueDate`, y `upcomingCharges` **hardcoded**.
- No existe ruta `app/src/app/parent/finances/...` (link sí existe en `app/src/app/parent/page.tsx`).

### Stable errors already include finance codes
- `app/src/lib/errors.ts` define:
  - `FINANCE_FORBIDDEN`, `FINANCE_INVALID_PERIOD_KEY`, `FINANCE_CONCEPT_NOT_FOUND`, `FINANCE_SCOPE_VIOLATION`.

**Gap:** no existen modelos/acciones para pagos (no hay `FinancePayment` en schema).

## 3) Key unknowns / decisions to make in S02

### 3.1 Payment application rule (determinism)
S02 debe definir una regla simple y determinista. Opciones:

A) **Pago ligado a un Cargo (recommended MVP)**
- `FinancePayment` incluye `chargeId` (nullable o required).
- El saldo por alumno = sum(charges.amount) - sum(payments.amount) (filtrado por alumno), y opcionalmente actualizar `FinanceCharge.status`.
- Pro: determinista, simple, sin allocations.
- Con: no soporta “pago a cuenta” multi-cargo sin modelo extra.

B) Pago “a cuenta” (unapplied) + allocations
- Requiere `FinancePaymentAllocation` o lógica de aplicación FIFO.
- Pro: más flexible.
- Con: aumenta complejidad y riesgos en SQLite.

**Recomendación para M003/S02:** implementar A) primero; permitir `chargeId` requerido (o permitir null pero solo en UI admin futuro). Si se permite null, el estado de cuenta debe seguir determinista (balance = charges - payments) pero la UX de “a qué aplicó” queda ambigua.

### 3.2 Attachment / comprobante
- Reusar el patrón existente de **Attachment** (D002) si el modelo ya existe.
- Diseño probable:
  - `FinancePayment` con `attachmentId` nullable (FK a `Attachment`)
  - o relación 1:N si se permite múltiples.

**Riesgo:** si Attachment está acoplado a otra entidad, puede requerir crear un tipo nuevo o generalizar relación.

### 3.3 Who is the account owner (Student vs Guardian/Family)
- Los cargos ya son por `studentId`.
- Estado de cuenta Parent en `/parent/finances` debe mapear “mis hijos” → students del tutor.
- Necesario ubicar relación Guardian↔Student existente (en R003).

## 4) Implementation constraints & patterns to follow

### 4.1 Tenant scoping
- Usar `getTenantIdFromSession()` (ya existe) en todas las acciones: `recordManual`, `getForParent`.
- Nunca aceptar `tenantSlug` / `tenantId` como input.

### 4.2 RBAC
- Escritura (registrar pagos): `assertFinanceWriteAccess()`.
- Lectura Parent: verificar `role === 'parent'` o membership/relación (ideal). Como mínimo:
  - parent puede leer solo los students asociados a su userId/guardianId.

### 4.3 Stable errors
- Agregar nuevos códigos en `STABLE_ERROR` para:
  - `FINANCE_CHARGE_NOT_FOUND`
  - `FINANCE_PAYMENT_INVALID_AMOUNT`
  - `FINANCE_PARENT_SCOPE_VIOLATION` (si se necesita separar)

Mantener mensajes “code-only” (string) para UI y tests.

### 4.4 Transactions
- Registrar pago y (si aplica) actualizar status del cargo en una `prisma.$transaction`.

### 4.5 SQLite + Prisma limitations
- Ya se evitó `createMany({ skipDuplicates })` en S01.
- Para pagos, el volumen será bajo; `create` individual en transacción es ok.

## 5) Code areas to touch (expected)

### Prisma schema
- Añadir modelos:
  - `FinancePayment` (y quizá `FinancePaymentMethod` enum)
  - Relación a `FinanceCharge` y/o `Student`
  - Campos sugeridos: `tenantId`, `studentId`, `chargeId?`, `amountCents`, `currency`, `paidAt`, `note?`, `reference?`, `attachmentId?`, `createdAt`, `createdById`.

### Server actions (new)
- `app/src/actions/finance/payments.ts`
  - `recordManual({ chargeId, studentId?, amountCents, paidAt, method, note, attachmentId? })`
- `app/src/actions/finance/statements.ts` (o `parent-finance.ts`)
  - `getForParent()` → lista students del parent + charges/payments + computed totals.

### UI
- Crear ruta real:
  - `app/src/app/parent/finances/page.tsx` (estado de cuenta).
- Actualizar parent dashboard:
  - `app/src/actions/parent.ts` → eliminar `upcomingCharges` mock y usar el statement real (o al menos llamar a la misma fuente real).

## 6) Verification targets (what to test in S04, but design now)

Contract checks sugeridos:
1. Parent no puede ver charges/payments de otro tenant.
2. Admin/director puede registrar pago solo en charges del mismo tenant.
3. `balance = sum(charges) - sum(payments)` determinista.
4. Si pago ligado a cargo: `charge.status` cambia a `paid` cuando sum(payments for charge) >= amount.

**Nota:** tests deben usar seams `__TEST_PRISMA__`/`__TEST_SESSION__` (D008).

## 7) Skill discovery (suggestions, not installed)

### Prisma
- `npx skills add fellipeutaka/leon@prisma` (9 installs)
- `npx skills add violabg/dev-recruit@prisma` (5 installs)

### Next.js
- `npx skills add manutej/luxor-claude-marketplace@nextjs-development` (57 installs)
- `npx skills add thebushidocollective/han@nextjs-server-components` (28 installs)

(Ya hay skill instalada `context7` y varias de frontend, pero para S02 el trabajo es más backend/Prisma/Next routing.)

## 8) Risks & mitigations

- **Riesgo:** Parent finances sigue mock y se olvida reemplazar → **Mitigación:** eliminar/rehacer `getParentDashboardData.financial` para que provenga de DB.
- **Riesgo:** Ambigüedad de aplicación de pagos → **Mitigación:** forzar `payment.chargeId` en MVP.
- **Riesgo:** Scope violation (cargar charge de otro tenant) → **Mitigación:** lookup `FinanceCharge` con `where: { id, tenantId: ctx.tenantId }` y error estable.
- **Riesgo:** Falta de relación parent↔students en queries → **Mitigación:** mapear primero el modelo existente (Guardian/Student) antes de definir `getForParent`.

## 9) Next concrete exploration needed (for implementation slice work)

Before coding S02, map:
- Relación exacta de **parent/tutor** con students en Prisma (`Guardian`, `StudentGuardian`, etc.).
- Modelo **Attachment** y cómo se relaciona hoy con entidades.
- Patrón de páginas Parent existentes (layout, tabs, antd components) para replicar en `/parent/finances`.
