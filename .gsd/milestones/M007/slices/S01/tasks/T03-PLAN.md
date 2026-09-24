---
estimated_steps: 4
estimated_files: 1
skills_used: []
---

# T03: Dataset mínimo: usuarios/roles/permisos para admin + teacher/parent/student

- Extender seed para crear roles/permisos necesarios.
- Crear usuarios activos por rol con credenciales de dev (documentadas, no secretas).
- Si hay constraints especiales (estado, schoolId, etc.), cubrirlas.
- Verificar que roles DB existen (no solo fallback por email).

## Inputs

- `Task T01 findings`
- `app/prisma/schema.prisma`
- `app/src/auth.ts`

## Expected Output

- `Roles en DB para tenant demo: admin/director/teacher/parent/student`
- `UserRole links creados por email demo`

## Verification

cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs
