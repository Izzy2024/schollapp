---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T02: Implementar prisma db seed (config) y hacer seed idempotente

- Configurar Prisma seed (package.json y/o prisma schema) para `prisma db seed`.
- Asegurar que el script seed es idempotente (upsert por email/slug/clave natural).
- Manejar transacción si aplica y orden de creación.
- No loggear secretos.

## Inputs

- `Task T01 outputs`
- `Prisma docs (si hiciera falta)`

## Expected Output

- ``prisma db seed` ejecuta sin error`
- `Seed re-ejecutable sin duplicados`

## Verification

cd app && npx prisma db seed
