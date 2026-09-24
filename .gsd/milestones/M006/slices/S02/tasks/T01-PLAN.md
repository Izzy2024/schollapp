---
estimated_steps: 7
estimated_files: 2
skills_used: []
---

# T01: Student: crear placeholders para todas las rutas 404 de menú

1) Crear un componente reutilizable `UnderConstructionPage` (o wrapper) para páginas placeholder con:
   - título
   - descripción breve
   - botón volver al dashboard del rol
   - breadcrumb
2) Crear rutas en `app/src/app/student/*` para cada href 404 (class-prep, attendance, exams, assignments, schedule, peers, messages, analytics, reports, news, activities, whats-new, settings).
3) Verificar que navegar desde menú Student ya no devuelve 404.

## Inputs

- `.gsd/milestones/M006/slices/S01/S01-INVENTORY.md`

## Expected Output

- `Rutas student placeholder existentes y renderizando`

## Verification

pnpm -C app build
