---
estimated_steps: 6
estimated_files: 3
---

# T04: Gate final (lint + test + build) y endurecer señal de diagnóstico en tests

**Slice:** S04 — Estabilización (lint/types/build) + suite de verificación sin mock.module
**Milestone:** M003

## Description

Cerrar la slice con una pasada final de gates y con tests suficientemente “diagnósticos” (mensajes y aserciones claras). Este task remueve el `RED PROBE` introducido en T01 y reemplaza esa señal por aserciones reales que fallan cuando el contrato se rompe.

## Steps

1. Remover `// RED PROBE (remove in T04)` y la aserción intencionalmente fallida en los test files.
2. Revisar que los tests validen explícitamente:
   - RBAC: parent no puede mutar (y el error es estable)
   - scope: tenantId viene de sesión (prisma stub debe fallar si se intenta usar input cliente)
   - dedupe: no se crean duplicados para mismo `periodKey`
   - saldo: totals consistentes con charges/payments
   - activity: existe `finance.*` y `metadata` es JSON parse-safe
3. Asegurar que los mensajes de aserción digan qué contrato falló y cómo reproducirlo.
4. Ejecutar gates completos en secuencia exacta.
5. Si hay flakiness, estabilizar (eliminar dependencia en orden de ejecución; reset global seam state por test).
6. Dejar notas breves en los comentarios del test sobre el patrón seam (para evitar regresión a `mock.module`).

## Must-Haves

- [ ] Los tests ya no contienen aserciones “rojas” artificiales.
- [ ] `pnpm -C app lint && pnpm -C app test && pnpm -C app build` pasan.
- [ ] Los tests fallan de forma diagnóstica si se rompe un contrato crítico.

## Verification

- `pnpm -C app lint && pnpm -C app test && pnpm -C app build`

## Observability Impact

- Signals added/changed: tests como contrato ejecutable y “alarma” de regresión.
- How a future agent inspects this: correr gates y leer el fallo exacto por contrato.
- Failure state exposed: assertion messages + stable error codes.

## Inputs

- Tests creados en T01.
- Fixes de DTO/build de T02 y lint de T03.

## Expected Output

- `app/src/actions/finance/__tests__/finance.contract.test.ts` — suite estable (sin probes) + aserciones diagnósticas.
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts` — suite estable (sin probes) + aserciones diagnósticas.
