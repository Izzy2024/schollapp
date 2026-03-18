---
estimated_steps: 6
estimated_files: 3
---

# T04: Construir UI Parent real en /parent/finances y remover mocks del dashboard parent

**Slice:** S02 — Registro manual de pagos + Estado de cuenta Parent (real, no mock)
**Milestone:** M003

## Description

Entregar la superficie real para Parent: `/parent/finances` debe renderizar el estado de cuenta desde DB y reemplazar cualquier mock financiero existente en el dashboard parent para evitar regresión post-lanzamiento.

## Steps

1. Crear `app/src/app/parent/finances/page.tsx` siguiendo el layout/patrón de páginas parent existentes.
2. Consumir `getForParent()` y manejar estados: loading, empty (sin cargos), y error (mostrar `error.code`).
3. Renderizar por student: saldo (amount format), lista de cargos (periodKey/conceptName/amount) y lista de pagos (paidAt/method/amount/note si aplica).
4. Actualizar `app/src/actions/parent.ts` para remover `financial` hardcoded y usar el statement real (o devolver `balanceDue` basado en `getForParent`).
5. Ajustar `app/src/app/parent/page.tsx` si consume el shape viejo (evitar romper UI).
6. Validar navegación: el link a finanzas abre `/parent/finances`.

## Must-Haves

- [ ] `/parent/finances` muestra datos reales persistidos (cargos/pagos) y saldo determinista.
- [ ] No quedan mocks financieros en `getParentDashboardData` (o están detrás de un flag de dev no usado en prod).

## Verification

- `pnpm -C app dev` y navegar a `/parent/finances` como Parent con datos seeded.
- `pnpm -C app build` (smoke) para asegurar que la ruta compila.

## Observability Impact

- Signals added/changed: UI muestra error estable por `code` (no solo “Something went wrong”).
- How a future agent inspects this: navegar a `/parent/finances` y ver si está en empty/error/data; revisar network/server action errors.
- Failure state exposed: render de error-code y fallback visible.

## Inputs

- `app/src/actions/finance/statements.ts` — `getForParent`.
- `app/src/actions/parent.ts` — actualmente contiene mocks.

## Expected Output

- `app/src/app/parent/finances/page.tsx` — estado de cuenta real.
- `app/src/actions/parent.ts` — sin mocks de finanzas.
- Dashboard parent sigue funcionando y direcciona a `/parent/finances`.
