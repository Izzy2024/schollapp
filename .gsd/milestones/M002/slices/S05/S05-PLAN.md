# S05: Bitácora Global y Dashboard (Overview)

**Goal:** Consolidar la bitácora global y el dashboard overview con contratos estables de eventos/filtros, superficies director/admin consistentes y métricas confiables en tiempo real por tenant.
**Demo:** Un director/admin puede abrir Overview y Activity, ver KPIs reales (matrícula, asistencia hoy, pendientes), filtrar bitácora sin drift de taxonomía y validar trazabilidad/diagnóstico en rutas protegidas.

## Must-Haves

- R006: Mantener `ActivityEvent` como almacenamiento canónico, normalizar taxonomía de `entityType`/`action` y asegurar filtros deterministas en feed.
- R006: Exponer superficie de bitácora para director (`/director/activity`) con RBAC y aislamiento multi-tenant.
- R005: Overview debe mostrar KPI de asistencia de hoy con cálculo consistente por ventana diaria y validación de borde.
- R004: Overview debe mostrar KPI de matrícula activos/relevantes por ciclo y ocupación base (vía agregaciones existentes).
- R001 (cross-cutting): Todas las consultas/acciones de S05 deben mantener scope por `tenantId` y permisos por rol, incluyendo failure paths con señales estables.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `app/src/test/actions/activity-feed.contract.test.ts` (filtros canónicos, taxonomía action/entityType, parse seguro de metadata, tenant isolation)
- `app/src/test/actions/overview-kpis.integration.test.ts` (consistencia de KPIs matrícula/asistencia/pendientes; bordes de fecha)
- `app/src/test/routes/director-overview-activity.rbac.test.tsx` (acceso director permitido, no-director denegado, no data leakage cross-tenant)
- `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx`

## Observability / Diagnostics

- Runtime signals: `ActivityEvent` con acciones namespaced estables (`enrollment.*`, `attendance.*`, `announcement.*`), metadata parse-safe con marker de fallback y errores RBAC/alcance con códigos estables.
- Inspection surfaces: UI `/admin/activity` + `/director/activity`, UI `/director/overview` (o wrapper equivalente), tablas `ActivityEvent`/agregaciones en acciones (`admin.ts`, `directorStats.ts`).
- Failure visibility: pruebas verifican errores de autorización/scope y fallback de metadata inválida; feed conserva trazabilidad con `occurredAt`, `actorUserId`, `entityType`, `entityId`.
- Redaction constraints: no exponer secretos ni payloads sensibles en metadata renderizada; solo claves diagnósticas mínimas de dominio.

## Integration Closure

- Upstream surfaces consumed: `app/src/actions/enrollment.ts`, `app/src/actions/attendance.ts`, `app/src/actions/announcements.ts`, `app/src/actions/admin.ts`, `app/src/actions/directorStats.ts`, `app/src/actions/activity.ts`, modelo Prisma `ActivityEvent`.
- New wiring introduced in this slice: contratos canónicos de feed/filtro compartidos + rutas director (`/director/activity`, `/director/overview`) conectadas a acciones existentes con wrappers RBAC/tenant.
- What remains before the milestone is truly usable end-to-end: cerrar evidencia final del milestone M002 (compilación de pruebas de slices y demo operacional integrada); no se planea nuevo modelo de bitácora.

## Tasks

- [x] **T01: Crear pruebas en rojo para contratos S05 (feed, KPIs y RBAC director)** `est:50m`
  - Why: Definir condición objetiva de cierre de S05 antes de implementar y evitar drift entre contexto/documentación y comportamiento real.
  - Files: `app/src/test/actions/activity-feed.contract.test.ts`, `app/src/test/actions/overview-kpis.integration.test.ts`, `app/src/test/routes/director-overview-activity.rbac.test.tsx`
  - Do: Escribir suites iniciales con fixtures multi-tenant que fallen por contrato faltante o inconsistente: filtros canónicos de activity, parse seguro de metadata legacy, KPI asistencia hoy/matrícula, acceso director y rechazo no autorizado.
  - Verify: `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx` (debe iniciar con fallos esperados).
  - Done when: Existen los 3 archivos de prueba con aserciones explícitas de contrato S05 y al menos una falla real por suite.

- [x] **T02: Normalizar contrato de bitácora y filtros canónicos en acciones/UI de activity** `est:1h20m`
  - Why: El mayor riesgo de S05 es drift de taxonomía y filtros no deterministas; este task cierra la base de R006 y diagnósticos.
  - Files: `app/src/actions/activity.ts`, `app/src/app/admin/activity/page.tsx`, `app/src/lib/activity-taxonomy.ts`, `app/src/lib/activity-metadata.ts`, `app/src/actions/enrollment.ts`, `app/src/actions/attendance.ts`, `app/src/actions/announcements.ts`
  - Do: Introducir mapa canónico compartido (`entityType`/`action` válidos), aplicar en query/filter/render del feed, unificar emisiones donde haya drift y agregar parse-safe de metadata con fallback diagnóstico sin romper UI.
  - Verify: `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts`
  - Done when: Filtros y acciones aceptadas son deterministas entre productores/consumidor, metadata inválida no rompe feed y suite de contrato de activity pasa en verde.

- [x] **T03: Conectar superficies director de Activity + Overview con wrappers RBAC/tenant** `est:1h20m`
  - Why: S05 requiere cierre de integración usuario-final en rutas director usando primitivas existentes, sin duplicar lógica.
  - Files: `app/src/app/director/activity/page.tsx`, `app/src/app/director/overview/page.tsx`, `app/src/actions/directorActivity.ts`, `app/src/actions/directorOverview.ts`, `app/src/actions/admin.ts`, `app/src/actions/directorStats.ts`
  - Do: Implementar/reusar wrappers server-side para director que consuman stats/feed existentes, reforzar guardas de rol/scope y alinear widgets KPI (matrícula, asistencia hoy, pendientes) con contratos de prueba.
  - Verify: `pnpm test -- app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx`
  - Done when: Director puede cargar Activity y Overview con datos reales tenant-scoped, no-director recibe denegación estable, y suites KPI+RBAC pasan en verde.

- [x] **T04: Cierre de slice con verificación integrada, diagnóstico y actualización documental** `est:40m`
  - Why: Confirmar que S05 queda operativamente cerrada, con evidencia reproducible y trazabilidad de decisiones para siguientes slices.
  - Files: `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md`, `.gsd/milestones/M002/slices/S05/tasks/T01-SUMMARY.md`, `.gsd/milestones/M002/slices/S05/tasks/T02-SUMMARY.md`, `.gsd/milestones/M002/slices/S05/tasks/T03-SUMMARY.md`
  - Do: Ejecutar suite combinada de S05, registrar resultado y comandos, documentar señales de observabilidad/failure-path verificadas y preparar resumen de integración real alcanzada.
  - Verify: `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts app/src/test/actions/overview-kpis.integration.test.ts app/src/test/routes/director-overview-activity.rbac.test.tsx`
  - Done when: Evidencia de verificación está documentada en artifacts de slice y el estado de cierre refleja integración S05 probada.

## Files Likely Touched

- `app/src/actions/activity.ts`
- `app/src/actions/admin.ts`
- `app/src/actions/directorStats.ts`
- `app/src/actions/directorActivity.ts`
- `app/src/actions/directorOverview.ts`
- `app/src/lib/activity-taxonomy.ts`
- `app/src/lib/activity-metadata.ts`
- `app/src/app/admin/activity/page.tsx`
- `app/src/app/director/activity/page.tsx`
- `app/src/app/director/overview/page.tsx`
- `app/src/test/actions/activity-feed.contract.test.ts`
- `app/src/test/actions/overview-kpis.integration.test.ts`
- `app/src/test/routes/director-overview-activity.rbac.test.tsx`
- `.gsd/milestones/M002/slices/S05/S05-SUMMARY.md`
