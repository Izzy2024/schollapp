---
estimated_steps: 5
estimated_files: 6
---

# T03: Conectar superficies director de Activity + Overview con wrappers RBAC/tenant

**Slice:** S05 — Bitácora Global y Dashboard (Overview)
**Milestone:** M002

## Description

Habilitar experiencia director end-to-end de S05 reutilizando lógica existente (sin duplicaciones innecesarias), reforzando guardas RBAC y aislamiento multi-tenant para cumplir R001 + R004/R005/R006 en rutas de negocio visibles.

## Steps

1. Implementar/ajustar wrappers server-side (`directorActivity.ts`, `directorOverview.ts`) que reutilicen acciones actuales con validación de rol y `tenantId`.
2. Crear o completar `/director/activity/page.tsx` enlazando al feed normalizado y filtros canónicos.
3. Crear o completar `/director/overview/page.tsx` enlazando KPIs de matrícula/asistencia hoy/pendientes desde wrappers.
4. Alinear mensajes/errores de autorización con códigos/estados estables para pruebas y diagnóstico.
5. Ejecutar suites de KPIs + RBAC y corregir cualquier fuga cross-tenant o inconsistencia de cómputo.

## Must-Haves

- [ ] Director visualiza Activity y Overview con datos reales tenant-scoped; rol no autorizado no obtiene acceso ni datos.
- [ ] KPI de matrícula/asistencia/pendientes en director overview coincide con contratos de prueba S05.

## Verification

- `pnpm test -- app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx`
- Verificación opcional de regresión: `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts`

## Observability Impact

- Signals added/changed: Errores RBAC/scope estables en wrappers director; superficies UI director con estado consistente.
- How a future agent inspects this: Entrando a rutas director + suites de integración RBAC/KPI.
- Failure state exposed: Denegaciones y discrepancias KPI quedan trazables por pruebas de integración y ruta afectada.

## Inputs

- `app/src/lib/activity-taxonomy.ts`, `app/src/lib/activity-metadata.ts`, `app/src/actions/activity.ts` — contratos normalizados de T02.
- `app/src/test/actions/overview-kpis.integration.test.ts`, `app/src/test/routes/director-overview-activity.rbac.test.tsx` — criterios de cierre definidos en T01.

## Expected Output

- `app/src/app/director/activity/page.tsx` y `app/src/app/director/overview/page.tsx` — UI funcional de S05 para director.
- `app/src/actions/directorActivity.ts` y `app/src/actions/directorOverview.ts` — wiring reusable con RBAC/tenant guard.
