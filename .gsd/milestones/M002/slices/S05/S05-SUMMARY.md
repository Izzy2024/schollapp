---
id: S05
milestone: M002
slice: S05
title: "Bitácora Global y Dashboard (Overview)"
status: done
completed_at: 2026-03-18
verification:
  command: "pnpm -C app test -- src/test/actions/activity-feed.contract.test.ts src/test/actions/overview-kpis.integration.test.ts src/test/routes/director-overview-activity.rbac.test.tsx"
  result: pass
  passed_suites:
    - activity-feed.contract.test.ts
    - overview-kpis.integration.test.ts
    - director-overview-activity.rbac.test.tsx
requirements_coverage:
  R006_bitacora_global:
    status: met
    evidence:
      - "Contrato de feed tenant-scoped con filtros canónicos + orden temporal + parse-safe metadata (suite: activity-feed.contract.test.ts)"
      - "Superficies UI conectadas: /admin/activity, /director/activity"
  R005_overview_kpis:
    status: met
    evidence:
      - "KPIs (matrícula, asistencia hoy UTC, pendientes con breakdown estable) verificados por overview-kpis.integration.test.ts"
      - "Superficie UI conectada: /director/overview"
  R004_pendientes_breakdown:
    status: met
    evidence:
      - "Shape estable pendingBreakdown + scopeTenantId verificado en overview-kpis.integration.test.ts"
  R001_rbac_tenant_isolation:
    status: met
    evidence:
      - "RBAC director con error estable UNAUTHORIZED_ROLE verificado en director-overview-activity.rbac.test.tsx"
      - "Tenant isolation forzando tenantSlug desde sesión; tests cubren slug externo"
observability_failure_paths:
  metadata_invalid_json:
    status: validated
    signal: ACTIVITY_METADATA_INVALID_JSON
    where:
      - "Payload del feed (metadata parse-safe)"
      - "UI /admin/activity muestra badge diagnóstico cuando aplica"
  rbac_denied:
    status: validated
    signal: UNAUTHORIZED_ROLE
    where:
      - "Wrappers server-side de director (overview/activity)"
notes:
  - "El comando de verificación en raíz del repo (pnpm test -- app/...) no aplica: el workspace root no tiene script test; se ejecuta con -C app."
  - "Se introdujo un seam de tests via globals (__TEST_SESSION__/__TEST_PRISMA__) para evitar mock.module (incompatible con tsx --test)."
risks_remaining:
  - "No se ejecutó demo browser end-to-end en esta tarea; la evidencia de cierre es por contratos/integración (tests). Si se requiere demo UI, añadir un task de smoke manual con datos reales." 
what_is_closed:
  - "S05 queda cerrado a nivel de contrato/integración: feed de actividad + overview KPIs + RBAC director + aislamiento tenant, con señales de failure-path verificadas." 
what_remains_for_M002:
  - "Cierre total de M002 depende de slices restantes fuera de S05; revisar estado de otros slices en .gsd/milestones/M002." 
key_files:
  - app/src/test/actions/activity-feed.contract.test.ts
  - app/src/test/actions/overview-kpis.integration.test.ts
  - app/src/test/routes/director-overview-activity.rbac.test.tsx
  - app/src/app/admin/activity/page.tsx
  - app/src/app/director/activity/page.tsx
  - app/src/app/director/overview/page.tsx
  - app/src/actions/activity.ts
  - app/src/actions/admin.ts
  - app/src/actions/directorOverview.ts
---

# S05 — Bitácora Global y Dashboard (Overview)

## Resultado

Slice S05 cerrado con verificación en verde de los contratos de:

- Feed de actividad (bitácora global) tenant-scoped con filtros canónicos y metadata parse-safe.
- KPIs del overview (matrícula, asistencia hoy con ventana UTC, pendientes con breakdown estable).
- RBAC de superficies director + aislamiento cross-tenant.

## Verificación reproducible

Ejecutar desde la raíz del repo:

```bash
pnpm -C app test -- \
  src/test/actions/activity-feed.contract.test.ts \
  src/test/actions/overview-kpis.integration.test.ts \
  src/test/routes/director-overview-activity.rbac.test.tsx
```

Salida esperada: 3 suites, 0 fails.

## Diagnóstico / Observability (validado)

- `ACTIVITY_METADATA_INVALID_JSON`: se preserva y expone de forma segura cuando metadata no parsea.
- `UNAUTHORIZED_ROLE`: error estable cuando un usuario no-director intenta acceder a wrappers director.

## Límites

- Esta evidencia de cierre se basa en contratos/integración (tests). Si se requiere demostración UI con datos reales, añadir smoke manual adicional.
