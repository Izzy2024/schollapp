---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T02: Escribir UAT por rol (M006) + smoke checklist final

1) Crear `S03-UAT.md` con un script por rol para navegar el menú y verificar:
   - rutas OK real
   - rutas placeholder (en construcción)
   - no 404
2) Incluir precondición de seed (`node app/prisma/seed.ts`).
3) Incluir señales de fallo: 404, CallbackRouteError, rutas que crashean.

## Inputs

- `Runbook M005`
- `Inventario actualizado`

## Expected Output

- `UAT M006 listo`

## Verification

test -f .gsd/milestones/M006/slices/S03/S03-UAT.md

## Observability Impact

Smoke reproducible.
