# S01 ("Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin") — Research

**Date:** 2026-03-18

## Summary

Esta slice S01 es el **primer proof de Cobranza (R007)** dentro de M003: introducir un ledger mínimo en DB (Conceptos + Cargos) y exponer una **UI Admin/Director** que permita crear conceptos y generar cargos para alumnos **de forma idempotente** (sin duplicados por periodo). El principal riesgo es que la generación mensual se duplique por reintentos/refrescos; por eso el diseño debe anclar la idempotencia en **restricciones de esquema (unique key)** y generación **transactional** (createMany skipDuplicates / upsert).

El codebase ya tiene patrones maduros para: (a) **tenant-scope derivado de sesión** (no desde input del cliente), (b) **RBAC simple por rol** con errores estables (`stableError` + `STABLE_ERROR`), y (c) UI Admin basada en antd y `DashboardLayout`. También existe la infraestructura de tests por seams (`__TEST_PRISMA__`, `__TEST_SESSION__`) que evita `node:test mock.module` (fragilidad conocida). S01 debe alinearse a esos patrones para minimizar riesgo de regresiones.

## Recommendation

1) **Modelar Finanzas en Prisma** agregando entidades:
   - `FinanceConcept` (tenant-scoped) con tipo `monthly|one_time`, `amountCents`, `currency`, `isActive`, `name`.
   - `FinanceCharge` (tenant-scoped) con `studentId`, `conceptId`, `amountCents`, `status`, `dueDate`, y **`periodKey` nullable**.

2) **Idempotencia por esquema + generación server-side**:
   - Para cargos mensuales: `periodKey` obligatorio (ej. `YYYY-MM`) y `@@unique([tenantId, studentId, conceptId, periodKey])`.
   - Para cargos únicos: `periodKey = null` y dedupe se controla desde UI/acción (o un `externalKey` opcional si se quiere idempotencia general). Para S01 el requisito explícito es dedupe por periodo mensual.

3) **Server Actions endurecidas** siguiendo `announcements.ts`:
   - Resolver `tenantId` por `auth()` → `session.user.tenantSlug` → lookup en `Tenant`.
   - RBAC: permitir sólo `admin|director`.
   - Usar `stableError` con códigos nuevos para finanzas (recomendado ampliar `STABLE_ERROR`).
   - Generación: `financeCharge.generateForPeriod(periodKey, conceptId?, studentIds?)` usando `createMany({ skipDuplicates:true })` o `upsert` en loop dentro de `prisma.$transaction` (SQLite tolera ambos; `createMany+skipDuplicates` es más simple).

4) **UI Admin mínima**:
   - Nueva sección /admin/finances (y reexport en /director/finances si aplica) con dos tabs:
     - "Conceptos": CRUD básico.
     - "Cargos": selector de periodo + concepto + (opcional) alumno(s) y botón "Generar" con feedback (cuántos creados vs ya existentes).

5) **Impacto de placeholders existentes**:
   - `getParentDashboardData` hoy devuelve finanzas mock (balance/upcomingCharges). S01 no lo reemplaza aún (eso es S02), pero debe documentarse como superficie a corregir.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Tenant-scope seguro | `auth()` + `session.user.tenantSlug` + `prisma.tenant.findUnique({ where:{slug}})` | Evita inyección de tenant desde el cliente; patrón ya repetido en actions. |
| RBAC y errores estables | `stableError` + `STABLE_ERROR` (`app/src/lib/errors.ts`) | Permite UI y tests deterministas; evita mensajes inconsistentes. |
| Infra de tests sin `mock.module` | `__TEST_SESSION__` y `__TEST_PRISMA__` seams (`app/src/lib/test-seams.ts`, `app/src/lib/prisma.ts`, `app/src/auth.ts`) | Es el enfoque aprobado por D008 y evita fragilidad del runner. |
| UI Admin | `DashboardLayout` + antd (ej. `app/src/app/admin/activity/page.tsx`) | Reduce tiempo de implementación y mantiene consistencia visual. |

## Existing Code and Patterns

- `app/src/actions/announcements.ts` — Referencia principal de hardening: resolve tenant desde sesión, `assert*Access`, `stableError`, y estructura de helpers privados.
- `app/src/lib/errors.ts` — Catálogo actual de errores estables; habrá que ampliarlo con códigos de finanzas (ej. `FINANCE_CONCEPT_NOT_FOUND`, `INVALID_PERIOD_KEY`, `FINANCE_SCOPE_VIOLATION`, etc.).
- `app/src/auth.ts` — `auth()` incluye seam `__TEST_SESSION__`, clave para tests de contrato.
- `app/src/lib/prisma.ts` — Prisma exportado incluye seam `__TEST_PRISMA__`.
- `app/src/actions/parent.ts` + `app/src/app/parent/page.tsx` — Finanzas en Parent hoy está **mockeado** (`balanceDue`, `upcomingCharges`); se consumirá/reemplazará en S02.
- `app/src/app/admin/activity/page.tsx` — Ejemplo de tabla + filtros + `antd message` para errores visibles; es un buen molde de UX de fallos.

## Constraints

- **DB = SQLite + Prisma** (Decisión D001):
  - La idempotencia debe descansar en un `@@unique` y/o `createMany({ skipDuplicates })`.
  - Transacciones disponibles con `prisma.$transaction`, pero evitar lógica compleja de locking.
- **Auth (NextAuth)**: sesiones usan `tenantSlug` y `tenantId` en token/session (ver `app/src/auth.ts`). Acciones deben ignorar `tenantSlug` input del cliente y preferir el de sesión.
- **Roles**: en `auth.ts` se retornan `roles: string[]`, pero muchos actions aún usan `session.user.role` singular. Esto es un punto a vigilar: S01 debe decidir un criterio consistente para RBAC (ideal: `roles` array).

## Common Pitfalls

- **Duplicación de cargos mensuales por reintento** — Evitar con `periodKey` normalizado (YYYY-MM) + `@@unique([tenantId, studentId, conceptId, periodKey])` y generación que use `skipDuplicates`/upsert.
- **PeriodKey inconsistente** — Normalizar/validar server-side (regex `^\d{4}-\d{2}$`) y evitar depender de timezone del cliente.
- **Tenant-scope por input** — Muchos actions aceptan `tenantSlug?: string` pero lo sobreescriben con `session.user.tenantSlug` (correcto). No introducir endpoints que lean `tenantId` desde el body.
- **RBAC ambiguo** — El codebase mezcla `role` vs `roles[]`. Definir helper `assertFinanceWriteAccess(session.user)` que cubra ambos.

## Open Risks

- **Modelado de relación “familia”**: para S01 basta con `studentId` (charges por alumno). Más adelante S02 necesitará statement por parent/guardian; hay que confirmar cómo se modela tutor→alumno (existe `Guardian`, `StudentGuardian`).
- **Estrategia de cargos “únicos”**: aunque S01 puede enfocarse en mensuales, la UI puede permitir cargos únicos; sin un `externalKey`/dedupe, reintentos podrían duplicarlos. Si el roadmap exige idempotencia también ahí, conviene planear un campo opcional `dedupeKey`.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Prisma | `sickn33/antigravity-awesome-skills@prisma-expert` | available (not installed) |
| Prisma | `prisma/skills@prisma-client-api` | available (not installed) |
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | available (not installed) |

## Sources

- Patrones de hardening (tenant-scope, stable errors, ActivityEvent) (source: `app/src/actions/announcements.ts`).
- Seam de tests sin `mock.module` (source: `app/src/lib/test-seams.ts`, `app/src/lib/prisma.ts`, `app/src/auth.ts`).
- Finanzas Parent actualmente mockeadas (source: `app/src/actions/parent.ts`, `app/src/app/parent/page.tsx`).
- DB provider SQLite y modelos tenant-scoped existentes (source: `app/prisma/schema.prisma`).
