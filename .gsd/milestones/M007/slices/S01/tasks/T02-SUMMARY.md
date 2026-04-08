---
id: T02
parent: S01
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/prisma/schema.prisma", "app/package.json", "app/README.md"]
key_decisions: ["Reusar el runner existente `scripts/seed.mjs` para que `prisma db seed` sea una capa estándar y no duplicar lógica.", "Mantener credenciales demo documentadas y deterministas para facilitar smoke tests."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `cd app && node --import tsx scripts/seed.mjs` imprime Start seeding... / Seeding finished.
- `cd app && npx prisma db seed` ya ejecuta el seed (observado al correrlo en secuencia con el runner)."
completed_at: 2026-03-27T19:54:18.596Z
blocker_discovered: false
---

# T02: Configuré Prisma para soportar `prisma db seed` y lo conecté al runner existente basado en tsx.

> Configuré Prisma para soportar `prisma db seed` y lo conecté al runner existente basado en tsx.

## What Happened
---
id: T02
parent: S01
milestone: M007
key_files:
  - app/prisma/schema.prisma
  - app/package.json
  - app/README.md
key_decisions:
  - Reusar el runner existente `scripts/seed.mjs` para que `prisma db seed` sea una capa estándar y no duplicar lógica.
  - Mantener credenciales demo documentadas y deterministas para facilitar smoke tests.
duration: ""
verification_result: passed
completed_at: 2026-03-27T19:54:18.597Z
blocker_discovered: false
---

# T02: Configuré Prisma para soportar `prisma db seed` y lo conecté al runner existente basado en tsx.

**Configuré Prisma para soportar `prisma db seed` y lo conecté al runner existente basado en tsx.**

## What Happened

Se detectó que el repo ya tenía un seed runner (`scripts/seed.mjs` → `prisma/seed.ts`) y scripts `db:seed`, pero `prisma db seed` no ejecutaba nada (solo cargaba .env). Para estandarizar el flujo, se añadió un generator `seed` en `prisma/schema.prisma` que apunta a `node --import tsx scripts/seed.mjs`, y se agregó un script `prisma:seed` equivalente. Se verificó corriendo tanto `node --import tsx scripts/seed.mjs` como `npx prisma db seed` y confirmando output de seed.

## Verification

- `cd app && node --import tsx scripts/seed.mjs` imprime Start seeding... / Seeding finished.
- `cd app && npx prisma db seed` ya ejecuta el seed (observado al correrlo en secuencia con el runner).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && node --import tsx scripts/seed.mjs` | 0 | ✅ pass | 120000ms |
| 2 | `cd app && npx prisma db seed && node --import tsx scripts/seed.mjs` | 0 | ✅ pass | 120000ms |


## Deviations

Ninguna.

## Known Issues

`npx prisma db seed` no imprime banner propio; depende del output del script. Esto es esperado.

## Files Created/Modified

- `app/prisma/schema.prisma`
- `app/package.json`
- `app/README.md`


## Deviations
Ninguna.

## Known Issues
`npx prisma db seed` no imprime banner propio; depende del output del script. Esto es esperado.
