---
estimated_steps: 7
estimated_files: 4
---

# T05: Superficie Admin mínima para registrar pago manual contra un cargo

**Slice:** S02 — Registro manual de pagos + Estado de cuenta Parent (real, no mock)
**Milestone:** M003

## Description

Añadir una interacción mínima en la UI de finanzas Admin/Director para registrar un pago manual asociado a un cargo existente, sin depender de scripts o edición directa de DB.

## Steps

1. Localizar la pantalla de cargos creada en S01 (lista por periodo o por alumno) y el componente de fila/acciones.
2. Agregar acción “Registrar pago” por cargo (button/menu) que abre un modal/drawer con formulario.
3. Implementar el form: `amountCents` (input moneda), `paidAt` (date), `method` (select), `note` (textarea opcional).
4. En submit, llamar `recordManual({ chargeId, amountCents, paidAt, method, note })`.
5. Manejar estados UI: loading, success (toast + refresh de tabla), error (mostrar `error.code`).
6. Revalidar datos necesarios (si usan `revalidatePath`/`router.refresh`) para que el cargo y/o resumen se actualice.
7. Validación manual: registrar pago y verificar que `/parent/finances` refleja el pago.

## Must-Haves

- [ ] Admin/Director puede registrar pago manual desde UI y la mutación respeta RBAC.
- [ ] Error paths visibles con códigos estables; no se silencian fallos.

## Verification

- Runtime (manual): como Admin registrar pago; como Parent ver el pago y nuevo saldo en `/parent/finances`.
- `pnpm -C app test -- payments-and-statement.actions.test.ts` (debe permanecer verde).

## Observability Impact

- Signals added/changed: UI surface para errores estables en mutación de pagos.
- How a future agent inspects this: reproducir flujo UI; revisar si el modal muestra `FINANCE_*`.
- Failure state exposed: error-code + UI state (disabled submit/loading).

## Inputs

- UI Admin de S01 (ruta y componentes de cargos).
- `app/src/actions/finance/payments.ts` — `recordManual`.

## Expected Output

- UI Admin actualizada con un modal/form para registrar pagos.
- Flujo completo Admin→Parent funciona con datos reales.
