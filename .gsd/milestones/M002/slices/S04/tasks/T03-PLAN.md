---
estimated_steps: 4
estimated_files: 4
---

# T03: Alinear routing de Director reutilizando la UI existente y cerrar verificación del slice

**Slice:** S04 — Comunicados Internos
**Milestone:** M002

## Description

Completar la superficie funcional esperada del slice: ruta para Director sin duplicación de lógica, navegación coherente por rol y cierre de verificación integral S04 en verde.

## Steps

1. Crear `app/src/app/director/announcements/page.tsx` como wrapper/reexport de la implementación existente de comunicados para evitar bifurcación.
2. Ajustar navegación/menú para que usuarios con rol Director puedan entrar a la nueva ruta.
3. Revisar estrategia de revalidación tras mutaciones para cubrir la ruta Director (y admin si permanece) sin inconsistencias de UI.
4. Actualizar y ejecutar pruebas de integración de ruta + regresión focal de acciones para confirmar cierre de slice.

## Must-Haves

- [ ] Director tiene acceso funcional a comunicados mediante `/director/announcements` con comportamiento equivalente a la superficie actual.
- [ ] No se duplica lógica de negocio/UI: una sola fuente de verdad para la pantalla y acciones.

## Verification

- `npm test -- director/announcements`
- `npm test -- announcements.actions director/announcements`

## Observability Impact

- Signals added/changed: none direct; consume señales de backend endurecidas en T02.
- How a future agent inspects this: navegar a `/director/announcements` y ejecutar prueba de integración de página.
- Failure state exposed: fallos de acceso/ruta o de render quedan explícitos en test de integración.

## Inputs

- `app/src/actions/announcements.ts` — acciones endurecidas en T02.
- `app/src/app/admin/announcements/page.tsx` — superficie UI existente a reutilizar.

## Expected Output

- `app/src/app/director/announcements/page.tsx` — ruta Director operativa sin duplicación.
- `app/src/app/director/announcements/__tests__/page.integration.test.tsx` — pruebas en verde validando acceso/uso.
- `app/src/components/navigation/*` — navegación por rol actualizada para exponer comunicados al Director.
