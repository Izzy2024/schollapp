# M003 / S05: Integración final “Lanzamiento” (happy path + failure visibility) — Research

**Date:** 2026-03-20

## Summary

S05 es un slice de **cierre operacional y UX de fallos**: demostrar que el MVP de Finanzas + Activity está realmente “lanzable” en runtime (no sólo por tests), y que los errores que puedan ocurrir en el happy path se **ven** con códigos estables (no silenciosos / no sólo en consola). Este slice soporta principalmente **R007 (Cobranza)** y **R009 (Estabilización)**, y en menor medida **R008 (Comunicación)** al confirmar que el Activity Feed sigue funcionando y que la app no degrada UX ante fallos.

El codebase ya contiene:
- UI Parent real en `app/src/app/parent/finances/page.tsx` consumiendo `getForParent()`.
- UI Admin de finanzas en `app/src/app/admin/finances/page.tsx` con tabs de Conceptos/Cargos y modal de registrar pago.
- Taxonomía/labels de eventos en `app/src/lib/activity-taxonomy.ts` y mapeo de textos para `finance.*` en `app/src/actions/activity.ts`.
- Suite de tests invocada por `app/src/test-runner.ts` incluyendo `./actions/finance/__tests__/finance.contract.test` y contrato de Activity en `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`.

El riesgo residual para “lanzamiento” no es tanto el modelado (S01–S04), sino:
1) **datos/seed**: que el flujo sea reproducible con usuarios/tenant reales;
2) **visibilidad de fallos**: que el UI muestre errores estables (código) y no quede en loading/blank;
3) **smoke runtime**: que `pnpm -C app dev` y navegación de rutas clave no rompa por import/edge runtime.

## Requirements this slice supports

- **R007 Cobranza Básica**: evidencia end-to-end (Admin genera cargos y registra pago → Parent ve saldo/historial). Confirmar que no quedan placeholders y que el cálculo es determinista.
- **R009 Estabilización y Tipado Estricto**: smoke real adicional a gates (lint/test/build ya deberían estar verdes por S04). En S05 se valida “no runtime surprises”.
- **R008 Comunicación** (parcial): confirmar que Activity Feed presenta `finance.*` de forma legible y con metadata parse-safe.

## Key risks / unknowns to resolve in S05

1) **Happy path reproducible**
   - ¿Existe un seed/fixture para tener: tenant + admin + parent/guardian + student(s) ya relacionados?
   - Si no existe, S05 debe especificar un procedimiento reproducible (en dev) para crear lo mínimo.

2) **Failure visibility**
   - Parent finances ya captura exceptions y muestra `Código: <errorCode>` (ver `parent/finances/page.tsx`). Debe verificarse que los actions realmente lanzan errores con `code` estable (`STABLE_ERROR.*`) y que no se pierda el código por `cause`.
   - Admin finanzas: confirmar que tabs/modales muestran errores con componente estable (existe `app/src/app/admin/finances/components/stableErrorUi.ts`).

3) **Observabilidad post-lanzamiento**
   - Los eventos `finance.*` deben verse en feed y tener copy no ambiguo (`app/src/actions/activity.ts` mapea texto para `finance.concept.created|updated`, `finance.charge.created`, `finance.payment.recorded`). Verificar que: (a) aparecen, (b) no hay PII en metadata, (c) el UI no truena si metadata es null/unknown.

4) **Rutas por rol / reexports**
   - Confirmar que existe la superficie Director (si el patrón de reexport aplica para finanzas como para announcements), o declarar explícitamente qué rol se usa para el smoke (Admin es suficiente para “lanzamiento”, pero los Success Criteria mencionan Admin/Director).

## Skill Discovery (suggest)

Tecnologías centrales para este slice: Next.js App Router, Prisma/SQLite, Ant Design (UI), Node test runner.

Skills instaladas relevantes (ya disponibles en el entorno):
- `context7` (para docs actuales de librerías, si se requiere)

Skills prometedoras (NO instalar en este slice; sólo sugerencia):
- Next.js App Router patterns: `npx skills add wshobson/agents@nextjs-app-router-patterns` (9.3K installs)
- Prisma expert: `npx skills add sickn33/antigravity-awesome-skills@prisma-expert` (2.8K installs)
- Prisma client API: `npx skills add prisma/skills@prisma-client-api` (2.4K installs)

## Codebase reconnaissance (what to inspect/use)

### Runtime surfaces to exercise
- Parent statement UI: `app/src/app/parent/finances/page.tsx` → `getForParent()`
- Admin finances UI: `app/src/app/admin/finances/page.tsx` +
  - `app/src/app/admin/finances/components/ConceptsTab.tsx`
  - `app/src/app/admin/finances/components/ChargesTab.tsx`
  - `app/src/app/admin/finances/components/RecordPaymentModal.tsx`
  - `app/src/app/admin/finances/components/stableErrorUi.ts`

### Observability surfaces
- Activity taxonomy group: `app/src/lib/activity-taxonomy.ts` (`finance` group)
- Activity feed copy mapping for finance: `app/src/actions/activity.ts` (actionStr checks)
- Contracts: `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`

### Verification entrypoints
- Test runner includes finance contracts: `app/src/test-runner.ts`

## Recommended S05 execution plan (manual, reproducible)

### A) Pre-flight (one-time)
1) Ensure DB is migrated and seed exists (or document minimal manual creation steps).
2) Start dev server: `pnpm -C app dev`.

### B) Happy path demo
1) Login as **Admin/Director** (tenant A).
2) Navigate to `/admin/finances`.
3) Create a **FinanceConcept** (mensual o único).
4) Generate charges for a specific period (e.g. `2026-03`) for one student.
5) Record a manual payment for that student/charge (with note).
6) Navigate to Activity Feed route and confirm new events exist:
   - `finance.concept.created`
   - `finance.charge.created`
   - `finance.payment.recorded`

7) Login as **Parent/Guardian** for the same student.
8) Navigate to `/parent/finances` and verify:
   - Totals: charges/payments/balance reflect DB (balance = charges − payments)
   - Per-student list shows the charge with periodKey and the payment with paidAt/method.

### C) Failure visibility demo (deliberate)
Pick one deterministic failure that should produce a stable error code:
- Try to generate charges for the same period twice (should be idempotent; if the UI triggers a unique constraint error, it must be caught and displayed as stable code; ideally it should succeed with “0 created”).
- Try to record a payment with invalid charge/student scope (should yield tenant/RBAC stable error).

Verify the UI shows:
- Parent: red card with `Código: <STABLE_ERROR...>` (or `UNKNOWN_ERROR` if unexpected; track as bug).
- Admin: stable error UI component content visible (not only console).

## Operational constraints / guardrails

- Nunca confiar tenantId desde cliente: siempre derivar desde `auth()` (esto ya es un contrato de S01–S04, pero S05 debe validar en runtime que el UI no pasa tenantId).
- Mantener metadata de Activity parse-safe y sin PII.
- No “silenciar” errores: preferir mostrar código estable en UI (ya implementado en Parent; confirmar Admin).

## Open questions (to answer during S05 implementation)

1) ¿Cuál es la ruta exacta del Activity Feed en UI (admin/director/parent) y cómo se navega a ella en el menú? (para documentar pasos reproducibles)
2) ¿Existe seed de usuarios/roles/tenant listo para demo o se requiere guión de creación mínima?
3) ¿La UI de finanzas para Director existe (reexport) o sólo Admin? Si sólo Admin, ¿se acepta para S05 o se requiere espejo Director?
