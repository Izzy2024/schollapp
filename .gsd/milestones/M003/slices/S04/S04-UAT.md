# S04 UAT: Estabilización (lint/types/build) + suite sin mock.module (M003)

## Objetivo
Validar que el repo está "lanzable": lint/test/build en verde y que la suite no depende de `mock.module`.

## Precondiciones
- Dependencias instaladas.

## Checks (operacional)
1. Ejecutar:
   - `pnpm -C app lint`
   - `pnpm -C app test`
   - `pnpm -C app build`
2. Expected: todos terminan con exit code 0.

## Check (negativo/diagnóstico)
- Si `pnpm -C app test` falla por `mock.module`:
  - Expected: no debería ocurrir; esta slice existe para eliminar esa fragilidad.

## Señales de fallo
- Cualquier comando falla.
- Tests flaky (pasan/fallan sin cambios).

## Notas
- Los tests contract usan seams globales (`globalThis.__TEST_SESSION__`, `globalThis.__TEST_PRISMA__`) para evitar mocking frágil.
