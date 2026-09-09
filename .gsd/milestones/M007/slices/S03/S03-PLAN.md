# S03: Menús por rol: single source tipada + adopción en layouts

**Goal:** Eliminar duplicación de menús/links por rol consolidándolos en una única definición reutilizable.
**Demo:** After this: Cambiar de rol cambia menú; no hay 404 desde navegación principal; una sola definición alimenta todo.

## Tasks
- [x] **T01: Inventarié los menús: `menuGroups` está duplicado en muchas páginas; `DashboardLayout` solo renderiza y no centraliza por rol.** — - Buscar componentes de layout/sidebar/nav actuales y cómo deciden items por rol.
- Identificar duplicaciones (admin/director/teacher/parent/student).
- Definir la estructura objetivo del menú (tipada) y mapping por rol.
- Elegir ubicación del single source (p.ej. `src/lib/nav/menu.ts`).

  - Estimate: 1-2h
  - Files: app/src/components/DashboardLayout.tsx, app/src/components/**, app/src/app/**/layout.tsx, app/src/lib/auth-guards.mjs
  - Verify: - `rg` encuentra los puntos únicos donde se define la navegación.
- Documento corto en el task summary con la lista de archivos y duplicaciones.

- [x] **T02: Creé un single source tipado de menús por rol en `src/lib/nav/menu.ts` con helpers de normalización y selección de rol principal.** — - Crear el módulo single source (tipado TS) con items por rol.
- Exponer helpers: `getMenuForRoles(roles)`, `getHomePathForRoles(roles)` (si conviene).
- Mantener compatibilidad con roles canónicos: admin/director/teacher/parent/student.
- Evitar hardcode de rutas en múltiples sitios.

  - Estimate: 2-4h
  - Files: app/src/lib/nav/** (nuevo), app/src/lib/auth-guards.mjs (si se integra)
  - Verify: - Typecheck pasa.
- Un rol dado devuelve siempre el mismo set de items.

- [x] **T03: Empecé la adopción del single source: reemplacé menús duplicados en admin y mantuve compatibilidad vía shims; verifiqué navegación a /admin/subjects con menú nuevo.** — - Reemplazar definiciones locales de items en layout/sidebar por el nuevo source.
- Asegurar que breadcrumbs/links apunten correcto.
- Smoke: login con admin/director/teacher/parent/student y navegar items principales.
- Arreglar links rotos detectados.

  - Estimate: 2-4h
  - Files: app/src/components/DashboardLayout.tsx, app/src/app/**/layout.tsx, app/src/app/**/page.tsx
  - Verify: - Navegación principal por rol no genera 404.
- No hay duplicación restante relevante.

- [x] **T04: Documenté el single source de menús por rol y un checklist UAT de navegación por rol.** — - Actualizar UAT de este slice: qué roles, qué items clave, qué verificar.
- Documentar dónde se define el menú y cómo agregar un item nuevo.
- Aclarar cómo elegir menú (roles del session) y fallback esperado.

  - Estimate: 30-60m
  - Files: .gsd/milestones/M007/slices/S03/**
  - Verify: Releer UAT y asegurar que los pasos son ejecutables.
