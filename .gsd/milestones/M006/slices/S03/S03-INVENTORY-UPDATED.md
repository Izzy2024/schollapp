# M006/S03 — Inventario actualizado (post S02)

Estado final tras aplicar opción A (páginas "En construcción") para eliminar 404 en menús.

Leyenda:
- **OK**: ruta implementada y carga UI real.
- **UC**: Under Construction (placeholder con label "En construcción").

## Admin

### OK
- `/admin`
- `/admin/subjects`
- `/admin/classes`
- `/admin/staff`
- `/admin/class-requests`
- `/admin/schedule-requests`
- `/admin/students`
- `/admin/enrollment`
- `/admin/attendance`
- `/admin/messages`
- `/admin/reports`
- `/admin/settings`
- `/admin/academic`
- `/admin/announcements`
- `/admin/finances`
- `/admin/calendar`

### UC (antes 404 en menú)
- `/admin/class-prep`
- `/admin/exams`
- `/admin/assignments`
- `/admin/schedule`
- `/admin/analytics`
- `/admin/news`
- `/admin/activities`

## Director

### OK
- `/director`
- `/director/overview`
- `/director/activity`
- `/director/announcements`
- `/director/enrollment`
- `/director/class-requests`
- `/director/schedule-requests`

### UC (antes 404 en menú)
- `/director/academic`
- `/director/financials`
- `/director/resources`
- `/director/accreditation`
- `/director/staff`

## Teacher

### OK
- `/teacher`
- `/teacher/planning`
- `/teacher/gradebook`
- `/teacher/schedule`
- `/teacher/students`
- `/teacher/messages`
- `/teacher/calendar`

### UC (antes 404 en menú)
- `/teacher/news`
- `/teacher/settings`

## Parent

### OK
- `/parent`
- `/parent/finances`
- `/parent/messages`
- `/parent/calendar`

### UC (antes 404 en menú)
- `/parent/documents`
- `/parent/news`
- `/parent/settings`

## Student

### OK
- `/student`

### UC (antes 404 en menú)
- `/student/class-prep`
- `/student/attendance`
- `/student/exams`
- `/student/assignments`
- `/student/schedule`
- `/student/peers`
- `/student/messages`
- `/student/analytics`
- `/student/reports`
- `/student/news`
- `/student/activities`
- `/student/whats-new`
- `/student/settings`

## Resultado
- Objetivo principal logrado: **0 rutas 404 expuestas desde menús principales** (según inventario S01).
- Si algún usuario ve `CallbackRouteError`/"Algo salió mal" en login, ejecutar seed: `node app/prisma/seed.ts`.
