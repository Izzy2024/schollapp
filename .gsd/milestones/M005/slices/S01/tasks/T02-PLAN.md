---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T02: UI Admin: crear/listar eventos + vista lectura teacher/parent

1) Encontrar patrón de routing para roles (admin/director/teacher/parent).
2) Crear pantalla Admin/Director para calendario: lista + botón crear (modal o página) con campos básicos.
3) Crear pantalla lectura Teacher/Parent (solo lectura) con lista por rango (semana/mes simple) o tabla.
4) Conectar a server actions.
5) Asegurar loading/error states estables.

## Inputs

- `Acciones T01`

## Expected Output

- `Rutas UI calendario por rol`
- `Form create event + list`
- `Lectura por teacher/parent`

## Verification

pnpm -C app lint && pnpm -C app build
