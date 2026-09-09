---
estimated_steps: 5
estimated_files: 5
skills_used: []
---

# T02: Admin/Director/Teacher/Parent: placeholders o link-fixes para rutas 404 de menú

1) Para Admin: crear placeholders en `app/src/app/admin/*` para class-prep, exams, assignments, schedule, analytics, news, activities.
2) Para Director: decidir por ruta si conviene redirigir a equivalente existente o placeholder; en primera pasada crear placeholders.
3) Para Teacher: crear placeholders para /teacher/news y /teacher/settings.
4) Para Parent: placeholders para /parent/documents, /parent/news, /parent/settings.
5) Verificar que navegar desde menú por rol no devuelve 404.

## Inputs

- `S01-INVENTORY`

## Expected Output

- `0 404 en menús principales`

## Verification

pnpm -C app build
