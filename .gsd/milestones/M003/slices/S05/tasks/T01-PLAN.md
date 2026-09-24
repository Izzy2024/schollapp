---
estimated_steps: 6
estimated_files: 2
---

# T01: Agregar verificación automatizada de “failure visibility” (códigos estables) para finanzas

**Slice:** S05 — Integración final “Lanzamiento” (happy path + failure visibility)
**Milestone:** M003

## Description

Agregar una prueba de contrato (Node test runner) que garantice que al menos un escenario de fallo determinista en finanzas produce un **código de error estable** (`STABLE_ERROR.*`) que llega al caller (server action). Esto protege el objetivo de S05 (“errores visibles”) contra regresiones donde se pierda el `code` y el UI termine mostrando `UNKNOWN_ERROR`.

## Steps

1. Inspeccionar las acciones de finanzas para elegir un fallo determinista y barato (preferencia: RBAC/scope).
2. Crear `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts` usando seams de test (`__TEST_PRISMA__` y `__TEST_SESSION__`).
3. En el test, ejecutar la acción con una sesión “incorrecta” (p.ej. Parent invocando acción admin, o admin intentando operar sobre entidad de otro tenant si el seam permite 2 tenants) y capturar el error.
4. Asertar que el error es un `StableError` (o tiene forma estable) y que `error.code` es el esperado (`STABLE_ERROR.RBAC_FORBIDDEN`, `STABLE_ERROR.TENANT_SCOPE_VIOLATION`, o el que aplique en el repo).
5. Registrar el test en `app/src/test-runner.ts` si el runner requiere import explícito.
6. Ejecutar `pnpm -C app test` y confirmar que la prueba falla inicialmente si el código aún no propaga (eso se arreglará en T02/T03 si es necesario).

## Must-Haves

- [ ] Existe un test que provoca un fallo determinista de finanzas y aserta `error.code` estable (no `UNKNOWN_ERROR`).
- [ ] El test usa seams (`__TEST_PRISMA__`/`__TEST_SESSION__`) y no depende de `mock.module`.

## Verification

- `pnpm -C app test`
- La aserción valida explícitamente el `code` esperado (y falla si cambia o se pierde).

## Observability Impact

- Signals added/changed: Añade un gate automatizado para la señal “código estable en fallos”, evitando regresiones silenciosas.
- How a future agent inspects this: Ejecutar `pnpm -C app test` y revisar el diff del test si falla.
- Failure state exposed: En caso de regresión, el output del test mostrará el `code` recibido vs esperado.

## Inputs

- `app/src/lib/test-seams.ts` — cómo inyectar Prisma/session en tests.
- `app/src/actions/finance/*` — acciones disponibles y sus patrones de error.

## Expected Output

- `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts` — nuevo test de contrato para códigos de error estables.
- `app/src/test-runner.ts` — incluye el test si aplica.
