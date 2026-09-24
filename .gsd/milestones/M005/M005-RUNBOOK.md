# M005 Runbook — Smoke & Diagnóstico (Post-lanzamiento)

## Objetivo
Checklist rápida para validar que el sistema está operativo (MVP) y para diagnosticar fallos sin perder tiempo.

## Precondiciones
- Dependencias instaladas.
- DB en estado conocido (dev):
  - Seed: `node app/prisma/seed.ts`
  - Nota: `prisma db seed` **no** está configurado en `app/package.json` actualmente.
- Dev server: `pnpm -C app dev`

## Usuarios demo
Password (todos): `demo-hash-123`
- Admin: `admin@demo.com`
- Director: `director@demo.com`
- Teacher: `docente1@demo.com`
- Parent: `padre@demo.com`

## Smoke checklist (por rol)

### 1) Admin
1. Login: `/login` → Admin → Ingresar
2. Académico: `/admin/academic` (ciclos/grados/secciones cargan)
3. Estudiantes: `/admin/students` (lista + búsqueda)
4. Inscripciones: `/admin/enrollment` (flujo carga)
5. Asistencia: `/admin/attendance` (selección grupo/fecha)
6. Finanzas: `/admin/finances` (conceptos/cargos/pagos)
7. Mensajes: `/admin/messages` (bandeja + thread)
8. Calendario: `/admin/calendar`
   - Crear evento simple ("Día festivo")
   - Expected: aparece en lista

### 2) Director
1. Login: `/login` → Director
2. Overview: `/director/overview` (KPIs cargan)
3. Activity: `/director/activity` (feed no vacío)
4. Comunicados: `/director/announcements` (crear/publicar)

### 3) Teacher
1. Login: `/login` → Profesor
2. Mensajes: `/teacher/messages` (bandeja + conversación seeded con Parent)
3. Calendario: `/teacher/calendar` (solo lectura)
4. Planning: `/teacher/planning` (unidades/tópicos)
   - Adjuntar archivo y confirmar que aparece

### 4) Parent
1. Login: `/login` (cambiar a `padre@demo.com` manualmente si no hay botón)
2. Finanzas: `/parent/finances` (estado de cuenta real)
3. Mensajes: `/parent/messages` (nuevo mensaje + thread)
4. Calendario: `/parent/calendar` (solo lectura)

## Diagnóstico rápido

### Login falla con `CallbackRouteError`
Causa típica: usuario demo no existe en DB.
- Ejecutar seed: `node app/prisma/seed.ts`
- Reintentar login.

### Errores estables (STABLE_ERROR)
La app usa códigos de error estables como mensajes (ej. `FINANCE_FORBIDDEN`, `CALENDAR_FORBIDDEN`).
- Si el UI muestra un código estable, buscarlo en `app/src/lib/errors.ts`.
- Confirmar RBAC/tenant-scope según slice.

### Activity Feed
- Ruta: `/director/activity`
- Eventos esperados:
  - `finance.*` (M003)
  - `communication.message.sent` (M004)

## Estado de requirements (GSD)
- Fuente de verdad: DB `.gsd/gsd.db` (ver decisión D009 en `.gsd/DECISIONS.md`).
- Check rápido:
  - `sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"`
  - Expected: `validated|11`

## Limitación conocida
- `.gsd/STATE.md` puede quedar desfasado respecto al DB (conteos/milestone activo) hasta que un flujo GSD lo regenere. No afecta la operación del proyecto ni `gsd_requirement_update`.
