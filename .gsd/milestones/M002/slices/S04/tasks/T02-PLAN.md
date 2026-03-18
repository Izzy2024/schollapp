---
estimated_steps: 5
estimated_files: 4
---

# T02: Endurecer server actions de comunicados con RBAC + validación de target + eventos completos

**Slice:** S04 — Comunicados Internos
**Milestone:** M002

## Description

Implementar el núcleo del slice en backend: guardas de rol y tenant, validación estricta de targets de comunicado y trazabilidad uniforme en `ActivityEvent` para todas las mutaciones clave.

## Steps

1. Introducir helper de autorización para acciones de comunicado, permitiendo solo roles definidos (`admin`, `director`) y retornando error estable.
2. Implementar validador de target que imponga reglas `all/grade/section` y verifique existencia/scope por `tenantId` en `GradeLevel`/`Section`.
3. Aplicar validaciones en create/publish/delete y normalizar errores de dominio (`INVALID_TARGET`, `TARGET_SCOPE_VIOLATION`, etc.).
4. Emitir `ActivityEvent` consistente en create/publish/delete con `entityType='announcement'`, `action` namespaced y metadata diagnóstica mínima.
5. Actualizar mapeo/lectura en `activity.ts` si requiere reconocer nuevas acciones y correr suite de acciones hasta verde.

## Must-Haves

- [ ] Ninguna mutación de comunicado puede ejecutarse sin rol autorizado ni con targets fuera de scope del tenant.
- [ ] `ActivityEvent` refleja de forma homogénea create/publish/delete y queda consumible por S05 sin heurísticas ambiguas.

## Verification

- `npm test -- announcements.actions`
- Aserción específica en pruebas: cada mutación exitosa crea un evento con `action` esperado y metadata mínima.

## Observability Impact

- Signals added/changed: nuevos eventos `announcement.created|published|deleted` y errores estables de dominio/autorización.
- How a future agent inspects this: revisar `ActivityEvent` en DB de pruebas o fixtures + salida de suite `announcements.actions`.
- Failure state exposed: códigos de error estables distinguen autorización, target inválido y violación de scope.

## Inputs

- `app/src/actions/__tests__/announcements.actions.test.ts` — contrato definido en T01.
- `app/src/actions/attendance.ts` — patrón de hardening ya validado en S03 para roles/scope.

## Expected Output

- `app/src/actions/announcements.ts` — acciones endurecidas con validación y eventos completos.
- `app/src/actions/activity.ts` — compatibilidad con acciones namespaced de comunicados.
- `app/src/lib/errors.ts` — códigos/mensajes estables para fallos esperados en S04.
