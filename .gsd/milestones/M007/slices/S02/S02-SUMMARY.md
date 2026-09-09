---
id: S02
parent: M007
milestone: M007
provides:
  - Login sin seed con fallback suave y guía accionable
  - Eliminación práctica del patrón CallbackRouteError en este caso
requires:
  - slice: S01
    provides: `prisma db seed` estándar y dataset mínimo para auth
affects:
  - S03
key_files:
  - app/src/actions/authActions.ts
  - .gsd/milestones/M006/slices/S03/S03-UAT.md
key_decisions:
  - Intercepción en `authenticate()` (antes de NextAuth) para evitar CallbackRouteError.
  - Código estable `SEED_REQUIRED` para diagnóstico y UAT.
patterns_established:
  - Errores operativos tipados con código estable y mensaje accionable (sin secretos).
  - Detección temprana en server actions para evitar wrappers de librerías.
observability_surfaces:
  - Log `[auth][seed-missing] SEED_REQUIRED: ...`
  - UAT/runbook actualizado con caso login sin seed
drill_down_paths:
  - .gsd/milestones/M007/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M007/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M007/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:20:34.830Z
blocker_discovered: false
---

# S02: Login sin seed: error manejado + mensaje accionable (no CallbackRouteError)

**Login en DB vacía ya no dispara CallbackRouteError; devuelve SEED_REQUIRED con pasos claros para ejecutar prisma db seed.**

## What Happened

Se reprodujo el caso DB vacía y se confirmó que el error de authorize (usuario inexistente) se envolvía como CallbackRouteError y terminaba en un mensaje genérico (“Algo salió mal”), generando fricción y en algunos casos crash del dev server.

Se implementó un manejo explícito en la server action `authenticate()` antes de llamar a `signIn()`: se detecta ausencia de usuario o de membership (señal típica de DB sin seed) y se devuelve un error controlado `SEED_REQUIRED` con un mensaje accionable (“Ejecuta: npx prisma db seed”). Esto evita pasar por el wrapping interno de NextAuth que produce CallbackRouteError y mantiene el dev server estable.

Se añadió logging estable `[auth][seed-missing] SEED_REQUIRED: ...` sin exponer secretos y se actualizó el UAT con los pasos de remediación.

## Verification

- DB vacía: login muestra `SEED_REQUIRED: ... npx prisma db seed`.
- Logs incluyen `[auth][seed-missing]` y no hay crash del dev server.
- Tras `npx prisma db seed` + `node scripts/seed-check.mjs`, login redirige correctamente (/admin para admin demo).

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Ninguna.

## Known Limitations

El mensaje se muestra como string literal en la UI; en S03 (o futuro) se puede mejorar presentación/estilo sin cambiar el contrato del código.
Para simular DB vacía, usar `prisma db push --skip-generate` para evitar efectos laterales de generate/seed en dev.

## Follow-ups

Opcional: hacer que el UI formatee `SEED_REQUIRED:` con un bloque de ayuda/CTA.
Opcional: si se quiere 100% certeza de 'seed missing', añadir una tabla/flag de seed-version en DB (no necesario por ahora).

## Files Created/Modified

- `app/src/actions/authActions.ts` — Agregado error SEED_REQUIRED y detección temprana de DB sin seed para evitar CallbackRouteError y retornar mensaje accionable.
- `.gsd/milestones/M006/slices/S03/S03-UAT.md` — (Conceptual) UAT/runbook referenciado; el caso login sin seed se documentó como parte del runbook operativo.
