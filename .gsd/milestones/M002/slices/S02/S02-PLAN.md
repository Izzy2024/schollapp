# S02: Inscripciones y Matrícula

**Goal:** Cerrar el flujo real de inscripción y reinscripción por ciclo con validación de cupo, aislamiento estricto por tenant y trazabilidad en bitácora para que control escolar opere matrícula sin riesgos cross-tenant.
**Demo:** Desde `/admin/enrollment`, control escolar puede inscribir un alumno al ciclo activo, darlo de baja y reinscribirlo al nuevo ciclo; si no hay cupo el sistema bloquea con error de negocio explícito; cada alta/baja/reinscripción genera `ActivityEvent` visible para consumo en S05.

## Must-Haves

- Reforzar mutaciones de matrícula (`enrollStudent`, `unenrollStudent`) con validaciones de pertenencia por `tenantId` en todas las entidades referenciadas.
- Definir una política única para `Section.capacity` (`null` = sin límite) aplicada de forma consistente en backend y UI.
- Soportar reinscripción explícita entre ciclos creando `Enrollment` del ciclo destino (sin depender de “baja” implícita) y prevenir duplicados por ciclo.
- Exponer errores de negocio estables para cupo/duplicidad/datos inconsistentes con señales que permitan diagnóstico.
- Registrar trazabilidad obligatoria en `ActivityEvent` para alta, baja y reinscripción (R006 soporte para S05).
- UI de `/admin/enrollment` debe reflejar reinscripción y mostrar feedback claro de validaciones de negocio.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `app/src/actions/__tests__/enrollment.actions.test.ts` (tenant boundary, capacity policy, duplicate-per-cycle, unenroll safety, activity event emission)
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` (UI feedback de errores de negocio y flujo de reinscripción)
- `cd app && npm test -- enrollment.actions.test.ts enrollment-page.test.tsx`
- `cd app && npm run build`
- Browser check en `http://localhost:3000/admin/enrollment` con assertions explícitas:
  - bloqueo por cupo agotado
  - reinscripción exitosa en nuevo ciclo
  - mensaje de éxito/error visible
- Verificación diagnóstica: consulta Prisma/acción para confirmar que cada mutación crea `ActivityEvent` con tipo y `tenantId` correctos.

## Observability / Diagnostics

- Runtime signals: emisión estructurada de `ActivityEvent` para `enrollment.created`, `enrollment.unenrolled`, `enrollment.reenrolled` con `tenantId`, `actorId`, `studentId`, `sectionId`, `academicYearId` y timestamp.
- Inspection surfaces: tabla `ActivityEvent` (Prisma Studio/query), mensajes de error estables retornados por server actions, estado visible en `/admin/enrollment`.
- Failure visibility: errores tipados de negocio (p.ej. `CAPACITY_EXCEEDED`, `ALREADY_ENROLLED_IN_YEAR`, `TENANT_SCOPE_VIOLATION`, `NO_ACTIVE_YEAR`) y ausencia/presencia de evento en bitácora para localizar punto de falla.
- Redaction constraints: no registrar secretos ni PII sensible fuera de IDs internos; mensajes UI sin datos sensibles.

## Integration Closure

- Upstream surfaces consumed: `auth()` de sesión, modelos Prisma (`Enrollment`, `Section`, `AcademicYear`, `ActivityEvent`, `Student`), UI existente en `app/src/app/admin/enrollment/page.tsx`.
- New wiring introduced in this slice: server actions endurecidas + contrato de errores de negocio + wiring UI para reinscripción y mensajes; escritura de eventos en `ActivityEvent` en cada transición de matrícula.
- What remains before the milestone is truly usable end-to-end: S03 (asistencia) debe consumir `Enrollment` por ciclo; S05 debe renderizar feed unificado desde `ActivityEvent`.

## Tasks

- [x] **T01: Crear pruebas de contrato para matrícula y reinscripción (fallando primero)** `est:1h`
  - Why: Fijar criterio de aceptación ejecutable para R004/R006 antes de tocar lógica, evitando regresiones en multi-tenant y cupo.
  - Files: `app/src/actions/__tests__/enrollment.actions.test.ts`, `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx`, `app/package.json`
  - Do: Crear suites que modelen inscripción, baja y reinscripción entre ciclos; cubrir errores estables de negocio y validar creación de `ActivityEvent`; añadir/verificar wiring del runner para ejecutar estas pruebas de forma aislada.
  - Verify: `cd app && npm test -- enrollment.actions.test.ts enrollment-page.test.tsx` (debe fallar inicialmente por funcionalidades faltantes).
  - Done when: Existen pruebas con assertions reales para contrato backend/UI y fallan por brechas actuales (no por setup roto).

- [x] **T02: Endurecer server actions de matrícula y registrar ActivityEvent** `est:2h`
  - Why: Cerrar riesgos de dominio (tenant scope, cupo, ciclo activo, duplicidad por ciclo) y producir trazabilidad confiable para S05.
  - Files: `app/src/actions/enrollment.ts`, `app/src/lib/*(helper de errores de dominio si aplica)`, `app/src/actions/__tests__/enrollment.actions.test.ts`
  - Do: Aplicar validaciones estrictas por `tenantId` en búsquedas/mutaciones; implementar política unificada `capacity=null => sin límite`; modelar reinscripción explícita en ciclo destino con prevención de duplicado por ciclo; emitir `ActivityEvent` en alta/baja/reinscripción; devolver errores de negocio estables consumibles por UI.
  - Verify: `cd app && npm test -- enrollment.actions.test.ts` y chequeo adicional de eventos creados (assert en test).
  - Done when: Todas las pruebas de acciones pasan y cada mutación de matrícula deja traza consistente en `ActivityEvent`.

- [x] **T03: Conectar UI de /admin/enrollment al nuevo contrato de reinscripción y errores** `est:1h30m`
  - Why: Convertir la robustez backend en progreso visible para usuario final de control escolar.
  - Files: `app/src/app/admin/enrollment/page.tsx`, `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx`, `app/src/actions/enrollment.ts`
  - Do: Extender flujo UI para reinscripción entre ciclos; mostrar mensajes claros por código de error de negocio (cupo/duplicidad/tenant/ciclo); unificar representación de capacidad sin límite; asegurar refresco de estado tras mutaciones exitosas.
  - Verify: `cd app && npm test -- enrollment-page.test.tsx && npm run build`; browser assertions en flujo real de inscripción/baja/reinscripción.
  - Done when: UI permite ejecutar el demo completo de S02 y comunica correctamente éxito/falla con base en contrato backend.

## Files Likely Touched

- `app/src/actions/enrollment.ts`
- `app/src/actions/__tests__/enrollment.actions.test.ts`
- `app/src/app/admin/enrollment/page.tsx`
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx`
- `app/src/lib/` (si se extraen tipos/códigos de error de dominio)
- `app/package.json`
