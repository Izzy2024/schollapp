---
estimated_steps: 4
estimated_files: 3
---

# T01: Crear pruebas de contrato para matrícula y reinscripción (fallando primero)

**Slice:** S02 — Inscripciones y Matrícula
**Milestone:** M002

## Description

Definir el contrato ejecutable de S02 antes de implementar cambios, cubriendo validaciones críticas de inscripción/reinscripción, límites por tenant y trazabilidad en `ActivityEvent`. Esta tarea debe dejar pruebas reales fallando por brechas funcionales actuales, no por falta de infraestructura.

## Steps

1. Crear `enrollment.actions.test.ts` con fixtures por tenant/ciclo/sección que cubran alta, baja, reinscripción, cupo y errores de negocio estables.
2. Crear `enrollment-page.test.tsx` para validar feedback UI (errores y éxito) y flujo de reinscripción desde `/admin/enrollment`.
3. Ajustar el runner/configuración de tests en `app/package.json` solo si es necesario para ejecutar ambos archivos de forma determinista.
4. Ejecutar pruebas objetivo y confirmar que fallan por comportamiento faltante esperado.

## Must-Haves

- [ ] Las pruebas backend incluyen asserts sobre emisión de `ActivityEvent` por cada mutación de matrícula.
- [ ] Existe cobertura explícita de tenant boundary (`TENANT_SCOPE_VIOLATION`) y cupo (`CAPACITY_EXCEEDED`).
- [ ] Las pruebas UI validan mensajes de negocio y flujo de reinscripción (no solo render básico).

## Verification

- `cd app && npm test -- enrollment.actions.test.ts enrollment-page.test.tsx`
- Resultado esperado: fallas ligadas a brechas actuales de lógica/contrato (base para T02/T03).

## Observability Impact

- Signals added/changed: pruebas que verifican presencia/ausencia de `ActivityEvent` y códigos de error de negocio.
- How a future agent inspects this: ejecutando la suite objetivo y revisando qué contrato falla.
- Failure state exposed: fallos de test localizan límite roto (tenant, cupo, reinscripción, bitácora).

## Inputs

- `app/src/actions/enrollment.ts` — contrato actual de server actions y brechas detectadas en research.
- `app/src/app/admin/enrollment/page.tsx` — flujo actual UI de inscripción/baja sobre el que se ancla la prueba de reinscripción.

## Expected Output

- `app/src/actions/__tests__/enrollment.actions.test.ts` — suite de contrato de dominio matrícula/reinscripción.
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` — suite de comportamiento UI y feedback de negocio.
- `app/package.json` — scripts/config test ajustados (si aplica) para correr el target de S02.