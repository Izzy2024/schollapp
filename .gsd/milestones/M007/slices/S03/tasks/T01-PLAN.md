---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T01: Inventario y consolidación: localizar menús por rol existentes

- Buscar componentes de layout/sidebar/nav actuales y cómo deciden items por rol.
- Identificar duplicaciones (admin/director/teacher/parent/student).
- Definir la estructura objetivo del menú (tipada) y mapping por rol.
- Elegir ubicación del single source (p.ej. `src/lib/nav/menu.ts`).

## Inputs

- `app/src/components/DashboardLayout.tsx`
- `app/src/lib/auth-guards.mjs`
- `Credenciales demo en app/README.md`

## Expected Output

- `Lista de definiciones de menú actuales`
- `Propuesta de single source + estructura`

## Verification

- `rg` encuentra los puntos únicos donde se define la navegación.
- Documento corto en el task summary con la lista de archivos y duplicaciones.
