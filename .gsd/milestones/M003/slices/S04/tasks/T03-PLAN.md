---
estimated_steps: 7
estimated_files: 8
---

# T03: Llevar lint a verde (tipado, hooks lint, prefer-const) sin deshabilitar reglas

**Slice:** S04 — Estabilización (lint/types/build) + suite de verificación sin mock.module
**Milestone:** M003

## Description

Convertir `pnpm -C app lint` en un gate real (R009). Hoy existe deuda grande (mucho `any`, reglas de hooks, prefer-const, no-unescaped-entities, etc.).

Estrategia: iterar por “clusters” de errores con cambios acotados por archivo, priorizando seams y finanzas (porque forman parte del gating y la suite nueva). No se permite deshabilitar reglas globalmente; sólo excepciones locales justificadas (y preferiblemente evitadas).

## Steps

1. Ejecutar `pnpm -C app lint` y capturar los top offenders por archivo/regla.
2. Arreglar primero seams y primitives compartidas (impacto alto):
   - reemplazar `any` por `unknown` + narrow o tipos utilitarios (`Record<string, unknown>`)
   - asegurar que `getTestSession()`/`getTestPrisma()` no propaguen `any`
3. Arreglar errores de hooks lint reportados (ej. `react-hooks/rules-of-hooks`, `react-hooks/set-state-in-effect`) en los componentes específicos (cambiar orden/condición de hooks; mover setState a handler o usar guard rails).
4. Arreglar `prefer-const`, `unused vars`, `no-unescaped-entities` y similares en archivos tocados por la slice (`/parent/finances` y tests nuevos incluidos).
5. Re-ejecutar `pnpm -C app lint` hasta llegar a 0 errores.
6. Re-ejecutar `pnpm -C app test` y `pnpm -C app build` para asegurar que lint fixes no rompen gates.
7. (Si aparecen errores en tests legacy) decidir: corregirlos si son triviales o ajustar el patrón de tests ejecutados por `pnpm -C app test` para que la suite oficial no dependa de `mock.module` (sin ocultar fallos reales de código productivo).

## Must-Haves

- [ ] `pnpm -C app lint` queda en verde sin deshabilitar reglas globalmente.
- [ ] Ningún cambio introduce `any` nuevo en código de finanzas, seams o UI de `/parent/finances`.
- [ ] `pnpm -C app test` sigue ejecutando la suite oficial M003.

## Verification

- `pnpm -C app lint`
- `pnpm -C app test`
- `pnpm -C app build`

## Observability Impact

- Signals added/changed: mejora de señales estáticas (lint) y reducción de “escape hatches” (`any`).
- How a future agent inspects this: ejecutar lint y seguir la regla/archivo exactos.
- Failure state exposed: el pipeline falla temprano con error claro (regla + ubicación).

## Inputs

- Salida real de `pnpm -C app lint` para priorizar por archivo.
- Seams y acciones de finanzas/activity (para no romper pruebas y build).

## Expected Output

- Conjunto acotado de fixes en archivos reportados por ESLint, con prioridad en:
  - `app/src/lib/test-seams.ts`
  - `app/src/lib/prisma.ts`
  - `app/src/auth.ts`
  - `app/src/actions/finance/**`
  - `app/src/actions/activity.ts`
  - `app/src/app/parent/finances/page.tsx`
- `pnpm -C app lint` en verde.
