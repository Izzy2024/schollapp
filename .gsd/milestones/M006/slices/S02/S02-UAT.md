# S02: Cerrar 404 con páginas "En construcción" + arreglar links de menú/breadcrumbs — UAT

**Milestone:** M006
**Written:** 2026-03-27T19:31:03.003Z

# UAT: S02 Cierre de 404 con placeholders

## Precondiciones
- Seed aplicado: `node app/prisma/seed.ts`
- App corriendo: `pnpm -C app dev`

## Caso 1 — Admin (rutas antes 404)
1. Login como Admin.
2. Navegar a: `/admin/class-prep`, `/admin/exams`, `/admin/assignments`, `/admin/schedule`, `/admin/analytics`, `/admin/news`, `/admin/activities`.
3. Expected: aparece label "En construcción"; no hay 404.

## Caso 2 — Student (rutas antes 404)
1. Login como Student.
2. Abrir varias rutas del menú (ej. `/student/attendance`, `/student/assignments`, `/student/messages`).
3. Expected: aparece "En construcción"; no hay 404.

## Caso 3 — Parent/Teacher/Director
1. Abrir una ruta placeholder por rol:
   - Parent: `/parent/documents`
   - Teacher: `/teacher/settings`
   - Director: `/director/financials`
2. Expected: aparece "En construcción".

