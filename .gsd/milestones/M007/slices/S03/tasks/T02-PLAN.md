---
estimated_steps: 4
estimated_files: 2
skills_used: []
---

# T02: Implementar menu source tipado + helper por rol

- Crear el módulo single source (tipado TS) con items por rol.
- Exponer helpers: `getMenuForRoles(roles)`, `getHomePathForRoles(roles)` (si conviene).
- Mantener compatibilidad con roles canónicos: admin/director/teacher/parent/student.
- Evitar hardcode de rutas en múltiples sitios.

## Inputs

- `T01 outputs`
- `app/src/lib/auth-guards.mjs`

## Expected Output

- `Nuevo módulo de menú tipado`
- `Helpers reutilizables`

## Verification

- Typecheck pasa.
- Un rol dado devuelve siempre el mismo set de items.
