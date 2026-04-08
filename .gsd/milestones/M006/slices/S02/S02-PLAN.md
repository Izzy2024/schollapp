# S02: Cerrar 404 con páginas "En construcción" + arreglar links de menú/breadcrumbs

**Goal:** Aplicar opción A: reemplazar 404 por placeholders consistentes y corregir navegación rota.
**Demo:** After this: Desde menús por rol ya no hay 404; si algo no existe muestra página clara de En construcción.

## Tasks
- [x] **T01: Student: creadas páginas placeholder para todas las rutas 404 del menú usando UnderConstructionPage reutilizable.** — 1) Crear un componente reutilizable `UnderConstructionPage` (o wrapper) para páginas placeholder con:
   - título
   - descripción breve
   - botón volver al dashboard del rol
   - breadcrumb
2) Crear rutas en `app/src/app/student/*` para cada href 404 (class-prep, attendance, exams, assignments, schedule, peers, messages, analytics, reports, news, activities, whats-new, settings).
3) Verificar que navegar desde menú Student ya no devuelve 404.

  - Estimate: 2-3h
  - Files: app/src/app/student/**, app/src/components/**
  - Verify: pnpm -C app build
- [x] **T02: Creadas páginas placeholder para rutas 404 expuestas en menús de Admin/Director/Teacher/Parent; 0 404 en menús principales (según inventario).** — 1) Para Admin: crear placeholders en `app/src/app/admin/*` para class-prep, exams, assignments, schedule, analytics, news, activities.
2) Para Director: decidir por ruta si conviene redirigir a equivalente existente o placeholder; en primera pasada crear placeholders.
3) Para Teacher: crear placeholders para /teacher/news y /teacher/settings.
4) Para Parent: placeholders para /parent/documents, /parent/news, /parent/settings.
5) Verificar que navegar desde menú por rol no devuelve 404.

  - Estimate: 2-3h
  - Files: app/src/app/admin/**, app/src/app/director/**, app/src/app/teacher/**, app/src/app/parent/**, app/src/components/**
  - Verify: pnpm -C app build
- [x] **T03: Gates verdes y smoke por rol: menús ya no llevan a 404, muestran placeholders 'En construcción'.** — 1) Ejecutar `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build`.
2) Levantar `pnpm -C app dev` y navegar por rol (login demo) verificando que menús no tienen 404.
3) Registrar en summary las rutas que ahora muestran placeholder.

  - Estimate: 1-2h
  - Files: .gsd/milestones/M006/slices/S02/**
  - Verify: pnpm -C app lint && pnpm -C app test && pnpm -C app build
