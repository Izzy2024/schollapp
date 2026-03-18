---
estimated_steps: 5
estimated_files: 3
---

# T01: Crear pruebas de contrato para S04 (fallando inicialmente)

**Slice:** S04 — Comunicados Internos
**Milestone:** M002

## Description

Definir la barrera de calidad del slice antes de tocar implementación: pruebas reproducibles para contrato de acciones (`create/publish/delete`), autorización por rol, validación de targets por tenant y emisión de eventos para bitácora, más prueba de integración de la ruta de Director.

## Steps

1. Crear fixtures/factories de anuncios y contexto multi-tenant para pruebas deterministas (tenant A/B, usuarios admin/director/docente).
2. Escribir `announcements.actions.test.ts` con escenarios felices y de falla: rol no autorizado, target inconsistente (`all` + targetId), target inexistente y target de otro tenant.
3. Añadir aserciones de observabilidad: verificar que cada mutación esperada deja `ActivityEvent` con `entityType`, `action` y metadata mínima.
4. Crear `page.integration.test.tsx` para `/director/announcements` validando reuso de superficie existente.
5. Ejecutar suites focales y confirmar fallo inicial por brechas reales de implementación (no por errores de setup).

## Must-Haves

- [ ] Las pruebas codifican explícitamente el contrato de RBAC/scope/target y trazabilidad que S04 debe cumplir.
- [ ] Las pruebas quedan fallando de forma intencional y diagnóstica antes de implementar hardening/ruta Director.

## Verification

- `npm test -- announcements.actions`
- `npm test -- director/announcements`

## Observability Impact

- Signals added/changed: aserciones sobre `ActivityEvent.action` namespaced y metadata de mutación de comunicados.
- How a future agent inspects this: ejecutar suites focales y revisar mensajes de aserción para identificar qué contrato se rompió.
- Failure state exposed: diferencia explícita entre fallo de autorización, fallo de target/scope y falta de evento de actividad.

## Inputs

- `app/src/actions/announcements.ts` — comportamiento actual de mutaciones de comunicados.
- Research S04 — riesgos abiertos de RBAC, target scope y trazabilidad incompleta.

## Expected Output

- `app/src/actions/__tests__/announcements.actions.test.ts` — suite de contrato S04 en rojo inicial.
- `app/src/app/director/announcements/__tests__/page.integration.test.tsx` — prueba de integración de ruta Director en rojo inicial.
- `app/src/test/factories/announcements.ts` — fixtures reutilizables para casos multi-tenant/roles.
