---
estimated_steps: 5
estimated_files: 2
---

# T02: Arreglar build Next alineando DTO/UI de /parent/finances (sin any)

**Slice:** S04 — Estabilización (lint/types/build) + suite de verificación sin mock.module
**Milestone:** M003

## Description

Cerrar el fallo de `next build` causado por mismatch entre el DTO retornado por `financeStatement.getForParent()` y la UI `/parent/finances`. Actualmente la UI espera `conceptName` en los cargos, pero el DTO no lo expone.

Este task debe alinear contrato y consumo **con tipos explícitos** (sin `any`) y sin aumentar exposición de PII: se permite nombre de concepto de cobro.

## Steps

1. Identificar en `app/src/actions/finance/statements.ts` el tipo/shape retornado por `getForParent()` (cargos/pagos/items/totals).
2. Elegir la solución preferida: incluir `concept: { name }` en el `select` y mapear a un DTO plano con `conceptName` (o `conceptTitle`, consistente con UI), manteniendo los ids necesarios.
3. Actualizar `app/src/app/parent/finances/page.tsx` para consumir el campo resultante con tipado seguro (si se renombra, ajustar UI).
4. Ejecutar `pnpm -C app build` y corregir cualquier error TS adicional emergente en la misma ruta.
5. Re-ejecutar `pnpm -C app test` para asegurar que los cambios de DTO no rompen tests contractuales.

## Must-Haves

- [ ] `pnpm -C app build` pasa (sin TS errors) con `/parent/finances` compilando.
- [ ] El DTO de statement está alineado con la UI y tipado explícitamente (sin `any`).

## Verification

- `pnpm -C app build`
- `pnpm -C app test`

## Observability Impact

- Signals added/changed: None (principalmente build-time type safety).
- How a future agent inspects this: `pnpm -C app build` falla con error TS apuntando a DTO/UI si vuelve a desalinearse.
- Failure state exposed: error de TypeScript durante build (ruta/archivo exactos).

## Inputs

- `app/src/actions/finance/statements.ts` — fuente del DTO.
- `app/src/app/parent/finances/page.tsx` — consumidor que hoy rompe build.

## Expected Output

- `app/src/actions/finance/statements.ts` — DTO actualizado con `conceptName` (o equivalente) y tipos.
- `app/src/app/parent/finances/page.tsx` — consumo alineado; build pasa.
