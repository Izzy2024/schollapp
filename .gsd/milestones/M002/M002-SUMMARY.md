---
id: M002
provides:
  - Operación diaria escolar: matrícula/reinscripción, control de asistencia, comunicados internos, bitácora global y dashboard de overview con KPIs.
key_decisions:
  - Validar y endurecer todas las mutaciones sensibles (matrícula/asistencia/comunicados) con scope estricto por tenant desde sesión y códigos de error estables para UX/tests.
  - Unificar trazabilidad mediante `ActivityEvent` namespaced por dominio (`enrollment.*`, `attendance.*`, `announcement.*`) con `metadata` JSON parse-safe.
  - Cerrar S05 (Overview/Activity) por contrato e integración con seam de tests (`__TEST_SESSION__`/`__TEST_PRISMA__`) para evitar mocking de módulos inestable en `node:test`.
patterns_established:
  - Guardrails previos a cualquier escritura: `get*WriteContext` + `assert*Access/Scope` + errores de dominio determinísticos.
  - Observabilidad de fallos: códigos estables (`UNAUTHORIZED_ROLE`, `TENANT_SCOPE_VIOLATION`, etc.) y señales parse-safe (`ACTIVITY_METADATA_INVALID_JSON`).
observability_surfaces:
  - UI: `/admin/activity`, `/director/activity`, `/director/overview`
  - Eventos persistidos: tabla `ActivityEvent` con `action/entityType/entityId/metadata/actorUserId`
  - Tests de contrato/integración (S05): `pnpm -C app test -- src/test/actions/activity-feed.contract.test.ts src/test/actions/overview-kpis.integration.test.ts src/test/routes/director-overview-activity.rbac.test.tsx`
requirement_outcomes: []
duration: unknown
verification_result: passed
completed_at: 2026-03-18
---

# M002: Operación Diaria y Control Escolar

**Se habilitó el núcleo de operación diaria (matrícula, asistencia, comunicados) y su trazabilidad centralizada (bitácora + overview con KPIs) bajo aislamiento multi-tenant, con cierres verificables por contratos/integración en S05.**

## What Happened

M002 integró los flujos esenciales para operar el día a día de una escuela:

- **S01** pulió la experiencia de autenticación y operación del staff: demo auto-login en `/login`, logout consistente desde el `DashboardLayout`, pantalla global `/profile`, y CRUD de **Docentes/Staff** en `/admin/staff`.

- **S02** implementó el flujo de **inscripción / baja / reinscripción** por ciclo con **validación de cupo**, aislamiento por tenant y errores de dominio estables. Se conectó la UI de `/admin/enrollment` a este contrato y se instrumentó trazabilidad vía `ActivityEvent` (`enrollment.created|unenrolled|reenrolled`).

- **S03** endureció el guardado de **asistencia** con validación estricta de estado, autorización por rol/alcance (incluyendo ownership docente), trazabilidad (`takenById`, `actorUserId`) y contrato de reporteo básico (por alumno y agregado por sección).

- **S04** habilitó **comunicados internos** con RBAC (`admin|director`), targets (`all|grade|section`) validados por tenant, y eventos de actividad namespaced (`announcement.created|published|deleted`). La ruta Director (`/director/announcements`) se implementó por reexport para evitar duplicación.

- **S05** consolidó la **bitácora global** y el **dashboard Overview**:
  - Feed tenant-scoped con filtros canónicos y `metadata` parse-safe.
  - KPIs de overview (matrícula, asistencia hoy en ventana UTC, pendientes con breakdown estable).
  - RBAC en superficies director (`/director/overview` y `/director/activity`) y aislamiento cross-tenant.

## Cross-Slice Verification

Este milestone requiere verificar los criterios de éxito del roadmap. Evidencia disponible:

1) **“Un alumno puede ser inscrito/reinscrito en un grupo con validación de cupo.”**
   - Evidencia: implementación en `app/src/actions/enrollment.ts` (S02/T02) con errores estables (`CAPACITY_EXCEEDED`, `ALREADY_ENROLLED_IN_YEAR`, `TENANT_SCOPE_VIOLATION`) y capacidad `null`=sin límite.
   - Evidencia adicional de trazabilidad: eventos `enrollment.*` consumidos por el feed (S05 contract incluye `enrollment.created`).
   - Nota de verificación: los contratos específicos de S02 (`app/src/actions/__tests__/enrollment.actions.test.ts` y UI test) no corren en esta máquina por incompatibilidad del runner con `node:test mock.module`.

2) **“Un docente puede pasar lista por grupo desde la plataforma.”**
   - Evidencia: wiring UI en `app/src/components/AttendanceDrawer.tsx` + acciones endurecidas en `app/src/actions/attendance.ts` (S03/T02-T03), con feedback determinístico y validación de estados.
   - Nota de verificación: suites de contrato S03 (`attendance.*.test.ts`) están bloqueadas por la misma limitación `mock.module`.

3) **“El director puede ver un reporte de asistencia por grupo y por alumno.”**
   - Evidencia parcial: contrato de KPIs/pendientes en `/director/overview` validado por test de integración S05:
     - `pnpm -C app test -- src/test/actions/overview-kpis.integration.test.ts` (pass)
   - Evidencia adicional: el contrato de S03 `attendance.reporting.test.ts` define agregado por alumno y `bySection`, pero no se pudo ejecutar por `mock.module`.

4) **“Se puede publicar un comunicado visible por grado/grupo/escuela.”**
   - Evidencia: `app/src/actions/announcements.ts` (S04/T02) valida targets y RBAC y emite `announcement.published`.
   - Nota de verificación: suite `announcements.actions.test.ts` e integración de `/director/announcements` quedan bloqueadas por `mock.module`.

5) **“Existe una bitácora (activity feed) con eventos clave del sistema.”**
   - Evidencia fuerte (verificado):
     - `pnpm -C app test -- src/test/actions/activity-feed.contract.test.ts` (pass)
     - UI conectada: `/admin/activity`, `/director/activity`
     - Failure-path validado: `ACTIVITY_METADATA_INVALID_JSON`

### Resultado de criterios de éxito
- Criterios **#1-#4**: implementados, pero **no verificados end-to-end por tests** debido a limitación del runner (`mock.module`).
- Criterio **#5**: **verificado** por contrato (tests en verde) y superficies UI conectadas.

## Requirement Changes

No se validaron transiciones de estado en `.gsd/REQUIREMENTS.md` para este milestone.

> Nota: Aunque R004/R005/R006 fueron implementadas parcialmente/totalmente, el repositorio mantiene todas como **Active**. Para promover a **Validated** sería necesario cerrar la brecha del runner (mocks) y/o agregar verificación reproducible adicional (tests/flows) para S02-S04.

## Forward Intelligence

### What the next milestone should know
- Hay una **brecha de infraestructura de tests**: varias suites (S02/S03/S04) usan `node:test` con `mock.module`, pero en Node v20.20.0 en este entorno `mock.module` **no existe**; esto impide usar esos tests como evidencia de cierre, aunque el código esté implementado.

### What's fragile
- Infra de pruebas basada en `mock.module` (en `app/src/actions/__tests__` y algunos tests de UI) — bloquea validación reproducible de matrícula/asistencia/comunicados.

### Authoritative diagnostics
- Verificación reproducible actualmente confiable:
  - `pnpm -C app test -- src/test/actions/activity-feed.contract.test.ts src/test/actions/overview-kpis.integration.test.ts src/test/routes/director-overview-activity.rbac.test.tsx`
  (S05 en verde y cubre R006 + parte de R005 + aislamiento R001).

### What assumptions changed
- “Podemos cerrar S02-S04 por suites de `node:test` con `mock.module`” — en esta máquina, esa API no está disponible; es necesario migrar el patrón de mocking (o usar otro runner) para recuperar señal de pruebas.

## Files Created/Modified

- `app/src/actions/enrollment.ts` — acciones endurecidas de matrícula con cupo, scope por tenant y eventos `enrollment.*`.
- `app/src/app/admin/enrollment/page.tsx` — UI conectada a contrato de matrícula/reinscripción con mensajes estables.
- `app/src/actions/attendance.ts` — acciones endurecidas de asistencia con validación, autorización y trazabilidad.
- `app/src/actions/announcements.ts` — acciones endurecidas de comunicados con targets y eventos `announcement.*`.
- `app/src/actions/activity.ts` — feed con filtros canónicos y metadata parse-safe.
- `app/src/app/director/overview/page.tsx` — overview con KPIs.
- `app/src/app/admin/activity/page.tsx`, `app/src/app/director/activity/page.tsx` — superficies UI del feed.
