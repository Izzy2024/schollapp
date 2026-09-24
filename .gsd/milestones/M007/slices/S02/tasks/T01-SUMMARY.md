---
id: T01
parent: S02
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/actions/authActions.ts", "app/src/auth.ts", "app/prisma/schema.prisma", "app/prisma/seed.ts"]
key_decisions: ["Para evitar CallbackRouteError, el manejo de 'seed missing' se implementará en `authenticate()` antes de llamar a `signIn()`."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- DB sin seed (schema creado, sin datos): `cd app && rm -f prisma/dev.db && touch prisma/dev.db && npx prisma db push --skip-generate`
- Navegar a `/login` y hacer submit con credenciales demo
- Verificar que aparece el mensaje genérico actual (`Algo salió mal. Intenta nuevamente.`)"
completed_at: 2026-03-27T20:11:30.373Z
blocker_discovered: false
---

# T01: Reproducido el fallo: con DB sin seed el login muestra error genérico ('Algo salió mal') y el error real se envuelve en NextAuth (CallbackRouteError).

> Reproducido el fallo: con DB sin seed el login muestra error genérico ('Algo salió mal') y el error real se envuelve en NextAuth (CallbackRouteError).

## What Happened
---
id: T01
parent: S02
milestone: M007
key_files:
  - app/src/actions/authActions.ts
  - app/src/auth.ts
  - app/prisma/schema.prisma
  - app/prisma/seed.ts
key_decisions:
  - Para evitar CallbackRouteError, el manejo de 'seed missing' se implementará en `authenticate()` antes de llamar a `signIn()`.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:11:30.376Z
blocker_discovered: false
---

# T01: Reproducido el fallo: con DB sin seed el login muestra error genérico ('Algo salió mal') y el error real se envuelve en NextAuth (CallbackRouteError).

**Reproducido el fallo: con DB sin seed el login muestra error genérico ('Algo salió mal') y el error real se envuelve en NextAuth (CallbackRouteError).**

## What Happened

Para simular un entorno sin seed, se vació el SQLite (`app/prisma/dev.db`) y se ejecutó `prisma db push --skip-generate` para crear el esquema sin poblar datos. Al intentar login desde `/login` con `admin@demo.com` / `demo-hash-123`, la UI muestra el mensaje genérico `Algo salió mal. Intenta nuevamente.` (mapeo default de AuthError no-credentials en `authenticate()`). Esto coincide con el patrón reportado: el error de authorize (usuario inexistente) se envuelve/eleva en NextAuth y no llega como un mensaje accionable; además en sesiones previas se observó `CallbackRouteError` en logs y crash del dev server.

Resultado: el repro confirma que el caso “DB vacía / sin seed” hoy no es distinguible de otros errores y termina en un mensaje genérico. El punto de interceptación más estable será `authenticate()` (server action) antes de `signIn()`, detectando la condición de seed faltante y retornando un error tipado/código estable (SEED_REQUIRED) con mensaje accionable, evitando que NextAuth envuelva el error como CallbackRouteError.

## Verification

- DB sin seed (schema creado, sin datos): `cd app && rm -f prisma/dev.db && touch prisma/dev.db && npx prisma db push --skip-generate`
- Navegar a `/login` y hacer submit con credenciales demo
- Verificar que aparece el mensaje genérico actual (`Algo salió mal. Intenta nuevamente.`)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && rm -f prisma/dev.db && touch prisma/dev.db && npx prisma db push --skip-generate` | 0 | ✅ pass | 120000ms |
| 2 | `Browser: POST login form (admin@demo.com / demo-hash-123)` | 0 | ✅ pass (UI shows generic error) | 30000ms |


## Deviations

Nota: `prisma db push` sin `--skip-generate` puede disparar seed por efecto lateral de generator; se evitó usando `--skip-generate` para preservar el repro (DB vacía).

## Known Issues

El repro mostró que `prisma db push` puede ejecutar el seed indirectamente si no se usa `--skip-generate`, lo cual dificulta simular DB vacía. Para S02/T01 se usó `--skip-generate` para evitar poblar data.

## Files Created/Modified

- `app/src/actions/authActions.ts`
- `app/src/auth.ts`
- `app/prisma/schema.prisma`
- `app/prisma/seed.ts`


## Deviations
Nota: `prisma db push` sin `--skip-generate` puede disparar seed por efecto lateral de generator; se evitó usando `--skip-generate` para preservar el repro (DB vacía).

## Known Issues
El repro mostró que `prisma db push` puede ejecutar el seed indirectamente si no se usa `--skip-generate`, lo cual dificulta simular DB vacía. Para S02/T01 se usó `--skip-generate` para evitar poblar data.
