# S01: Calendario Escolar Global (modelo + acciones + UI mínima + tests)

**Goal:** Implementar el requisito R011 con un alcance acotado: eventos globales del ciclo/escuela (no horarios).
**Demo:** After this: Admin crea eventos del calendario; Teacher/Parent ven la vista de calendario con los eventos correctos y tenant-scoped.

## Tasks
- [x] **T01: Agregado modelo `SchoolCalendarEvent` + migración y server actions calendario tenant-scoped con RBAC y errores estables.** — 1) Inspeccionar el esquema Prisma actual y patrones tenant-scoped (por sesión).
2) Definir modelos mínimos para eventos de calendario: `SchoolCalendarEvent` (o nombre consistente) con campos: id, tenantId, title, description?, startAt, endAt?, allDay, visibility/target? (opcional), createdByUserId, createdAt.
3) Agregar constraints/índices básicos (tenantId+startAt).
4) Implementar server actions: create, update, delete, listRange/listMonth.
5) Aplicar RBAC: admin/director write; teacher/parent read.
6) Superficie de errores estables (sin PII).
  - Estimate: 4-6h
  - Files: app/prisma/schema.prisma, app/src/app/**/calendar/**, app/src/lib/**
  - Verify: pnpm -C app lint && pnpm -C app test && pnpm -C app build
- [x] **T02: Agregadas pantallas de Calendario por rol: admin (crear/eliminar/listar) y vistas de solo lectura para teacher/parent.** — 1) Encontrar patrón de routing para roles (admin/director/teacher/parent).
2) Crear pantalla Admin/Director para calendario: lista + botón crear (modal o página) con campos básicos.
3) Crear pantalla lectura Teacher/Parent (solo lectura) con lista por rango (semana/mes simple) o tabla.
4) Conectar a server actions.
5) Asegurar loading/error states estables.
  - Estimate: 4-6h
  - Files: app/src/app/**/calendar/**, app/src/components/**
  - Verify: pnpm -C app lint && pnpm -C app build
- [x] **T03: Agregados contract tests de calendario + seed demo events y smoke runtime verificado creando un evento en /admin/calendar.** — 1) Escribir contract tests con `node:test` usando seams (`app/src/lib/test-seams.ts`).
2) Probar: tenant-scope (no leakage), RBAC (parent cannot create), listRange correcto.
3) Agregar seed/fixture mínimo para demo: tenant + users + algunos eventos.
4) Smoke runtime: admin crea evento y teacher/parent lo ve.

  - Estimate: 3-5h
  - Files: app/src/**/calendar*.test.ts, app/src/lib/test-seams.ts, app/prisma/seed.ts (o equivalente)
  - Verify: pnpm -C app test && pnpm -C app build
