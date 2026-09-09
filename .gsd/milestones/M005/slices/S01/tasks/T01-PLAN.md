---
estimated_steps: 6
estimated_files: 3
skills_used: []
---

# T01: Scaffold: modelo Prisma + migración + server actions (tenant/RBAC)

1) Inspeccionar el esquema Prisma actual y patrones tenant-scoped (por sesión).
2) Definir modelos mínimos para eventos de calendario: `SchoolCalendarEvent` (o nombre consistente) con campos: id, tenantId, title, description?, startAt, endAt?, allDay, visibility/target? (opcional), createdByUserId, createdAt.
3) Agregar constraints/índices básicos (tenantId+startAt).
4) Implementar server actions: create, update, delete, listRange/listMonth.
5) Aplicar RBAC: admin/director write; teacher/parent read.
6) Superficie de errores estables (sin PII).

## Inputs

- `.gsd/milestones/M005/M005-ROADMAP.md`
- `Patrones existentes en server actions (finanzas/mensajes/anuncios)`

## Expected Output

- `Nuevo modelo Prisma + migración aplicada`
- `Server actions calendario tenant-scoped`
- `Errores estables y RBAC`

## Verification

pnpm -C app lint && pnpm -C app test && pnpm -C app build
