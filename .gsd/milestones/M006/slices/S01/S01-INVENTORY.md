# M006/S01 — Inventario de rutas por rol (OK / 404 / Target: En construcción)

> Fuente: navegación real en runtime (localhost) recorriendo los menús por rol.

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

### 404 (en menú)
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

### 404 (en menú)
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

### 404 (en menú)
- `/teacher/news`
- `/teacher/settings`

## Parent

### OK
- `/parent`
- `/parent/finances`
- `/parent/messages`
- `/parent/calendar`

### 404 (en menú)
- `/parent/documents`
- `/parent/news`
- `/parent/settings`

## Student

### OK
- `/student`

### 404 (en menú)
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

---

## Top 10 — Prioridad (impacto/visibilidad)

1. **Student: casi todo el menú es 404** → requiere placeholders urgentes para que el rol sea usable.
2. **Admin: 7 rutas del menú 404** (`class-prep`, `exams`, `assignments`, `schedule`, `analytics`, `news`, `activities`).
3. **Director: 5 rutas del menú 404** (`academic`, `financials`, `resources`, `accreditation`, `staff`).
4. **Parent: documentos/noticias/config 404** (se percibe como producto incompleto).
5. **Teacher: noticias/config 404**.
6. Normalizar “rutas equivalentes”: algunas features existen en Admin pero el menú de Director/Student apunta a rutas propias inexistentes (decidir si se crea placeholder o se redirige).
7. Asegurar que placeholders distingan **No implementado** vs **Error real**.
8. Revisar enlaces secundarios (cards/CTAs) que apunten a rutas distintas al menú.
9. Revisar RBAC: evitar que placeholders expongan datos o rompan auth.
10. Agregar smoke/UAT por rol para evitar que 404 re-aparezcan.
