---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T03: Contract tests + verificación integración runtime (seed)

1) Escribir contract tests con `node:test` usando seams (`app/src/lib/test-seams.ts`).
2) Probar: tenant-scope (no leakage), RBAC (parent cannot create), listRange correcto.
3) Agregar seed/fixture mínimo para demo: tenant + users + algunos eventos.
4) Smoke runtime: admin crea evento y teacher/parent lo ve.

## Inputs

- `Patrón de tests sin mock.module (D008)`

## Expected Output

- `Suite de tests calendario en verde`
- `Seed reproducible (si aplica)`
- `Pasos de smoke documentados en summary`

## Verification

pnpm -C app test && pnpm -C app build
