---
estimated_steps: 7
estimated_files: 5
---

# T02: Endurecer UI Admin finanzas para mostrar errores estables en tabs/modales (sin blanks)

**Slice:** S05 — Integración final “Lanzamiento” (happy path + failure visibility)
**Milestone:** M003

## Description

Asegurar que la superficie Admin de finanzas (conceptos/cargos/pagos) muestra **errores estables** de forma visible, consistente y no bloqueante. El objetivo es que, ante fallos esperables (RBAC/scope, validación, errores de server action), el usuario vea un bloque UI con el **código** y un mensaje estable, sin que el UI quede “colgado” en loading ni dependa de la consola.

## Steps

1. Revisar `stableErrorUi.ts` y confirmar qué props necesita (code/message/details) y el patrón de uso esperado.
2. En `ConceptsTab.tsx`, envolver mutaciones (create/update) con captura de error (`try/catch`) y setear un estado `stableError` a renderizar.
3. En `ChargesTab.tsx`, asegurar que la generación/listado maneja:
   - error estable (mostrar UI)
   - caso idempotente (mensaje “0 creados” o equivalente sin tratarlo como error)
4. En `RecordPaymentModal.tsx`, capturar errores de `recordManual`, mostrar `stableErrorUi` dentro del modal y asegurar que el modal no se cierra en error.
5. En `admin/finances/page.tsx`, verificar que errores de carga inicial (si existen) se muestran con fallback estable.
6. Estandarizar el fallback: si no es `StableError`, mostrar `UNKNOWN_ERROR` pero **visible**.
7. Probar en runtime con `pnpm -C app dev` y provocar un error controlado (p.ej. enviar un formulario con campo requerido vacío o forzar una acción sin seleccionar alumno) para ver `Código: ...`.

## Must-Haves

- [ ] Ante error en cualquier mutación de finanzas en Admin, se renderiza un bloque visible con `code` (estable o `UNKNOWN_ERROR`).
- [ ] No hay estados de loading infinitos: el usuario puede reintentar y la UI vuelve a estado interactivo.

## Verification

- Manual: `pnpm -C app dev` → `/admin/finances` → provocar error controlado en (a) crear concepto o (b) registrar pago → confirmar que el UI muestra `Código: <...>`.
- (Regresión) `pnpm -C app test` sigue en verde (no romper snapshots/contract tests existentes).

## Observability Impact

- Signals added/changed: Se fortalece la señal “error estable” en UI Admin, alineada con la de Parent.
- How a future agent inspects this: Abrir `/admin/finances`, reproducir error del runbook y verificar bloque `stableErrorUi`.
- Failure state exposed: `code` estable renderizado; contexto mínimo visible (sin PII).

## Inputs

- `app/src/app/admin/finances/components/stableErrorUi.ts` — componente de error estable.
- `app/src/actions/finance/*` — qué errores y códigos puede emitir.

## Expected Output

- `app/src/app/admin/finances/components/ConceptsTab.tsx` — manejo de errores estable.
- `app/src/app/admin/finances/components/ChargesTab.tsx` — manejo de errores estable + idempotencia visible.
- `app/src/app/admin/finances/components/RecordPaymentModal.tsx` — manejo de errores estable dentro del modal.
- `app/src/app/admin/finances/page.tsx` — fallback de errores de carga/estado.
