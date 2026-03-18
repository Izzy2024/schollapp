# S04: Comunicados Internos

**Goal:** Endurecer y cerrar la operación de comunicados internos para que Dirección/Admin puedan crear, publicar y eliminar comunicados segmentados (escuela/grado/grupo) con RBAC, validación de target multi-tenant y trazabilidad completa para S05.
**Demo:** Desde la UI de comunicados, un usuario autorizado crea un comunicado para escuela/grado/grupo, lo publica y lo elimina; las mutaciones respetan scope de tenant, rechazan targets inválidos y generan eventos de actividad consistentes (`announcement.created|published|deleted`).

## Must-Haves

- Hardening de server actions de comunicados con autorización explícita por rol permitido (`admin` y `director`) en todas las mutaciones.
- Validación de reglas de negocio y scope por target: `all` sin `targetId`, `grade` con `GradeLevel` del tenant, `section` con `Section` del tenant.
- Trazabilidad homogénea en `ActivityEvent` para crear/publicar/eliminar con metadata diagnóstica estable.
- Alineación funcional de ownership de ruta para Director sin duplicar lógica (ruta `/director/announcements` reutilizando la superficie existente).
- Verificación automatizada reproducible de casos felices y de rechazo (RBAC/scope/target inválido) más evidencia de eventos para S05.

## Proof Level

- This slice proves: integration
- Real runtime required: no
- Human/UAT required: yes

## Verification

- `app/src/actions/__tests__/announcements.actions.test.ts` (nuevo): cubre create/publish/delete, RBAC denegado, target inválido y cross-tenant.
- `app/src/app/director/announcements/__tests__/page.integration.test.tsx` (nuevo): verifica que la ruta Director renderiza y reutiliza la experiencia de comunicados.
- `npm test -- announcements.actions`
- `npm test -- director/announcements`

## Observability / Diagnostics

- Runtime signals: eventos estructurados en `ActivityEvent` con `entityType='announcement'`, `action` namespaced y metadata mínima (`targetType`, `targetId`, `publishedNow`, `actorUserId`).
- Inspection surfaces: consultas Prisma sobre `Announcement`/`AnnouncementTarget`/`ActivityEvent`; UI en `/admin/announcements` y `/director/announcements`.
- Failure visibility: errores estables de acción para `UNAUTHORIZED_ROLE`, `INVALID_TARGET`, `TARGET_SCOPE_VIOLATION`, `ANNOUNCEMENT_NOT_FOUND`.
- Redaction constraints: no persistir contenido sensible no necesario en metadata; registrar ids y tipo de target, no payload completo del comunicado.

## Integration Closure

- Upstream surfaces consumed: `app/src/actions/announcements.ts`, `app/src/actions/activity.ts`, `app/src/actions/attendance.ts` (patrón de guards), `app/prisma/schema.prisma`, sesión/RBAC de M001.
- New wiring introduced in this slice: guardas de autorización+scope en server actions, emisión completa de eventos de actividad y wrapper de ruta `/director/announcements` reutilizando la UI existente.
- What remains before the milestone is truly usable end-to-end: integración del feed unificado y widgets Overview de S05 consumiendo estos eventos; validación operativa final con usuarios reales.

## Tasks

- [x] **T01: Crear pruebas de contrato para S04 (fallando inicialmente)** `est:1h`
  - Why: Definir primero la condición objetiva de cierre del slice (RBAC, target scope, trazabilidad y ruta Director) y evitar regresiones al endurecer backend.
  - Files: `app/src/actions/__tests__/announcements.actions.test.ts`, `app/src/app/director/announcements/__tests__/page.integration.test.tsx`, `app/src/test/factories/announcements.ts`
  - Do: Añadir suite de pruebas con fixtures multi-tenant que cubra create/publish/delete exitoso, rechazos por rol y target inválido/cross-tenant, y aserciones de creación de `ActivityEvent`; añadir prueba de integración de página para `/director/announcements` reusando la misma composición de UI.
  - Verify: Ejecutar `npm test -- announcements.actions` y `npm test -- director/announcements` y confirmar rojo inicial por funcionalidad no implementada.
  - Done when: Existen pruebas versionadas, deterministas y actualmente fallan exactamente por los huecos de S04 hardening/alineación.

- [x] **T02: Endurecer server actions de comunicados con RBAC + validación de target + eventos completos** `est:1h 30m`
  - Why: Cerrar el riesgo principal del slice (mutaciones sin guard y datos inválidos) y garantizar contrato de trazabilidad que S05 necesita.
  - Files: `app/src/actions/announcements.ts`, `app/src/actions/activity.ts`, `app/src/lib/errors.ts`, `app/src/actions/__tests__/announcements.actions.test.ts`
  - Do: Implementar helpers tipo `assertAnnouncementWriteAccess` y `assertValidAnnouncementTarget`; validar consistencia `targetType`/`targetId` y scope tenant contra `GradeLevel`/`Section`; estandarizar errores estables; emitir `ActivityEvent` en create/publish/delete con acciones namespaced; ajustar mapeo en `activity.ts` para mantener lectura consistente en feed.
  - Verify: `npm test -- announcements.actions`
  - Done when: Toda la suite de acciones queda en verde con aserciones explícitas de autorización, validación y eventos persistidos.

- [x] **T03: Alinear routing de Director reutilizando la UI existente y cerrar verificación del slice** `est:1h`
  - Why: Cumplir expectativa funcional del contexto (“Director publica comunicados”) sin bifurcar lógica ni duplicar mantenimiento.
  - Files: `app/src/app/director/announcements/page.tsx`, `app/src/app/admin/announcements/page.tsx`, `app/src/app/director/announcements/__tests__/page.integration.test.tsx`, `app/src/components/navigation/*`
  - Do: Crear ruta Director como wrapper/reexport de la página de comunicados existente; ajustar navegación para mostrar entrada a usuarios Director; asegurar que mutaciones/revalidaciones contemplan ambas rutas si aplica; actualizar pruebas de integración y smoke de navegación.
  - Verify: `npm test -- director/announcements` y corrida de regresión focal `npm test -- announcements.actions director/announcements`
  - Done when: Un director autenticado puede acceder a `/director/announcements` con la misma experiencia funcional y la verificación completa de S04 queda en verde.

## Files Likely Touched

- `app/src/actions/announcements.ts`
- `app/src/actions/activity.ts`
- `app/src/lib/errors.ts`
- `app/src/app/admin/announcements/page.tsx`
- `app/src/app/director/announcements/page.tsx`
- `app/src/actions/__tests__/announcements.actions.test.ts`
- `app/src/app/director/announcements/__tests__/page.integration.test.tsx`
- `app/src/test/factories/announcements.ts`
- `app/src/components/navigation/*`
