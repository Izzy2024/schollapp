---
estimated_steps: 6
estimated_files: 2
---

# T04: Smoke operacional final (build + navegación) y cierre de slice (gates + evidencia)

**Slice:** S05 — Integración final “Lanzamiento” (happy path + failure visibility)
**Milestone:** M003

## Description

Ejecutar el cierre operacional del slice: correr gates (lint/test/build), arrancar dev server y navegar rutas clave usando el seed/runbook. Capturar evidencia mínima en `S05-SUMMARY.md` y actualizar `.gsd/STATE.md` para reflejar S05 planificado/ejecutado (cuando corresponda en ejecución).

## Steps

1. Ejecutar gates: `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build`.
2. Arrancar `pnpm -C app dev` y seguir los checkpoints del `S05-RUNBOOK.md` para validar navegación y flujo (Admin/Parent + Activity).
3. Confirmar que el caso de failure visibility muestra `Código: ...` en UI (Admin o Parent, según runbook).
4. Escribir `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md` con:
   - comandos ejecutados + resultados
   - rutas verificadas
   - qué eventos `finance.*` se observaron
   - qué error estable se observó (code)
5. Actualizar `.gsd/STATE.md` para reflejar el estado del slice en el milestone (plan listo; en ejecución se marcará done).
6. Re-correr `pnpm -C app test` si se tocó algo al final.

## Must-Haves

- [ ] Gates en verde (lint/test/build) al final del slice.
- [ ] Evidencia de runtime (rutas y observaciones) registrada en `S05-SUMMARY.md`.

## Verification

- `pnpm -C app lint && pnpm -C app test && pnpm -C app build`
- Ejecución manual: seguir `S05-RUNBOOK.md` y validar observaciones.

## Observability Impact

- Signals added/changed: Summary actúa como “bitácora de verificación” para futuros diagnósticos.
- How a future agent inspects this: Leer `S05-SUMMARY.md` y re-ejecutar gates + runbook.
- Failure state exposed: Si falla un gate o la navegación, queda documentado con el punto exacto de ruptura.

## Inputs

- `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md` — procedimiento reproducible.
- Gates de S04 (lint/test/build) ya deberían estar verdes; aquí se re-valida.

## Expected Output

- `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md` — evidencia del cierre.
- `.gsd/STATE.md` — estado actualizado.
