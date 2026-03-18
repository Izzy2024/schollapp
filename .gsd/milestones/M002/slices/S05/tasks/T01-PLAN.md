---
estimated_steps: 4
estimated_files: 3
---

# T01: Crear pruebas en rojo para contratos S05 (feed, KPIs y RBAC director)

**Slice:** S05 — Bitácora Global y Dashboard (Overview)
**Milestone:** M002

## Description

Definir la línea base verificable de S05 escribiendo primero las pruebas de contrato/integración que codifican el comportamiento esperado de la bitácora global y overview de director/admin. Este task fuerza fallos iniciales para guiar implementación real en T02/T03.

## Steps

1. Crear `activity-feed.contract.test.ts` con fixtures multi-tenant y aserciones de filtro canónico (`entityType`/`action`), orden temporal, parse seguro de `metadata` inválida y no-filtración entre tenants.
2. Crear `overview-kpis.integration.test.ts` cubriendo KPI matrícula y asistencia de hoy (incluyendo borde de ventana diaria), más pendientes esperados por rol/scope.
3. Crear `director-overview-activity.rbac.test.tsx` para acceso a rutas director (permitido para director, denegado para roles no autorizados).
4. Ejecutar las tres suites para confirmar estado rojo inicial y documentar fallos esperados que T02/T03 deberán resolver.

## Must-Haves

- [ ] Los 3 archivos de prueba existen con aserciones explícitas sobre requisitos R006/R005/R004 + R001.
- [ ] Cada suite presenta al menos un fallo inicial real relacionado al contrato S05 (no fallos triviales de setup).

## Verification

- `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx`
- Revisar reporte de pruebas: fallos deben apuntar a drift de contratos S05 y no a errores sintácticos.

## Observability Impact

- Signals added/changed: Se formalizan señales esperadas (taxonomía eventos, errores RBAC, fallback metadata) como aserciones reproducibles.
- How a future agent inspects this: Ejecutando las suites de prueba de S05 y leyendo difs de assertions.
- Failure state exposed: Contratos rotos quedan visibles por suite/escenario (filtro, KPI, RBAC).

## Inputs

- `app/src/actions/activity.ts` — comportamiento actual de consulta/render de feed.
- `app/src/actions/admin.ts` y `app/src/actions/directorStats.ts` — cálculo actual de KPIs overview.
- `app/src/app/admin/activity/page.tsx` y rutas director existentes — referencia de superficies UI/RBAC.

## Expected Output

- `app/src/test/actions/activity-feed.contract.test.ts` — suite roja que define contrato canónico de bitácora.
- `app/src/test/actions/overview-kpis.integration.test.ts` — suite roja de consistencia KPI overview.
- `app/src/test/routes/director-overview-activity.rbac.test.tsx` — suite roja de acceso y aislamiento por rol/tenant.
