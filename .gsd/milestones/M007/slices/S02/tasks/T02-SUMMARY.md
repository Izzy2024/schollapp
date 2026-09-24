---
id: T02
parent: S02
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/actions/authActions.ts"]
key_decisions: ["Intercepción en `authenticate()` (server action) para evitar wrapping de NextAuth y su CallbackRouteError.", "Usar un código estable `SEED_REQUIRED` en el string devuelto para facilitar soporte y UAT."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Caso 1 (DB vacía): se observó que al enviar login se muestra `SEED_REQUIRED: ... Ejecuta: npx prisma db seed` y en server logs aparece `[auth][seed-missing]` sin CallbackRouteError fatal.
Caso 2 (tras correr seed): login con `admin@demo.com` / `demo-hash-123` redirige a `/admin`."
completed_at: 2026-03-27T20:18:49.990Z
blocker_discovered: false
---

# T02: Implementé manejo explícito SEED_REQUIRED en login para evitar CallbackRouteError y mostrar un mensaje accionable cuando falta seed.

> Implementé manejo explícito SEED_REQUIRED en login para evitar CallbackRouteError y mostrar un mensaje accionable cuando falta seed.

## What Happened
---
id: T02
parent: S02
milestone: M007
key_files:
  - app/src/actions/authActions.ts
key_decisions:
  - Intercepción en `authenticate()` (server action) para evitar wrapping de NextAuth y su CallbackRouteError.
  - Usar un código estable `SEED_REQUIRED` en el string devuelto para facilitar soporte y UAT.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:18:49.991Z
blocker_discovered: false
---

# T02: Implementé manejo explícito SEED_REQUIRED en login para evitar CallbackRouteError y mostrar un mensaje accionable cuando falta seed.

**Implementé manejo explícito SEED_REQUIRED en login para evitar CallbackRouteError y mostrar un mensaje accionable cuando falta seed.**

## What Happened

Se implementó un manejo explícito del caso “DB sin seed” en la server action `authenticate()` (app/src/actions/authActions.ts) antes de llamar a NextAuth. Se añadió un error local `SeedRequiredError` con código estable `SEED_REQUIRED`.

Ahora `resolveLoginRedirectPath()` incluye `memberships` y, si el usuario no existe o no tiene membership, lanza `SeedRequiredError` con un mensaje accionable indicando ejecutar `npx prisma db seed`. En `authenticate()`, este error se intercepta y se devuelve a la UI como string prefijado con el código (`SEED_REQUIRED: ...`).

Con esto, el flujo falla de forma controlada sin pasar por el wrapping interno de NextAuth que causaba `CallbackRouteError`. En logs se emite una línea estable `[auth][seed-missing] SEED_REQUIRED: ...` sin exponer secretos.

## Verification

Caso 1 (DB vacía): se observó que al enviar login se muestra `SEED_REQUIRED: ... Ejecuta: npx prisma db seed` y en server logs aparece `[auth][seed-missing]` sin CallbackRouteError fatal.
Caso 2 (tras correr seed): login con `admin@demo.com` / `demo-hash-123` redirige a `/admin`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Browser: DB vacía → submit login` | 0 | ✅ pass | 30000ms |
| 2 | `cd app && npx prisma db seed && node scripts/seed-check.mjs` | 0 | ✅ pass | 120000ms |
| 3 | `Browser: tras seed → submit login → URL contiene /admin` | 0 | ✅ pass | 30000ms |


## Deviations

Para simular DB vacía se usó `prisma db push --skip-generate` porque `db push` sin flags puede disparar seed indirectamente.

## Known Issues

El mensaje de seed se muestra literalmente en UI como string; en S02/T03 se puede mejorar el copy/estilo si se desea, pero ya cumple 'accionable'.

## Files Created/Modified

- `app/src/actions/authActions.ts`


## Deviations
Para simular DB vacía se usó `prisma db push --skip-generate` porque `db push` sin flags puede disparar seed indirectamente.

## Known Issues
El mensaje de seed se muestra literalmente en UI como string; en S02/T03 se puede mejorar el copy/estilo si se desea, pero ya cumple 'accionable'.
