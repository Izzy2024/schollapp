# Mapa de pantallas (rutas + módulos) — App web Admin
> Estructura pensada para **Next.js App Router** y un sidebar tipo dashboard (como tu ejemplo de UI).

---

## IA (Information Architecture) sugerida
Sidebar (Admin):
1. **Overview (Dashboard)**
2. **Students**
3. **Enrollment**
4. **Attendance**
5. **Messages / Announcements**
6. **Reports**
7. **Activity (Bitácora)**
8. **Settings**

---

## Rutas principales (Next.js)
### Auth
- `/login`
- `/forgot-password`
- `/reset-password`
- (Opcional) `/select-tenant` (si un usuario tiene varias escuelas)

### App (scope por tenant)
- `/:tenantSlug/overview`
- `/:tenantSlug/students`
- `/:tenantSlug/students/new`
- `/:tenantSlug/students/[studentId]`
- `/:tenantSlug/enrollment`
- `/:tenantSlug/attendance`
- `/:tenantSlug/announcements`
- `/:tenantSlug/reports`
- `/:tenantSlug/activity`
- `/:tenantSlug/settings`

---

## Pantallas y detalle funcional

## 1) Overview (Dashboard)
**Ruta:** `/:tenantSlug/overview`

**Objetivo:** “Command center” del director/control escolar.
**Widgets MVP**
- Matrícula total (ciclo activo)
- Asistencia hoy (% presente)
- Pendientes: alumnos sin documentos, inscripciones “preinscritas”
- Últimas actividades (activity feed)
- (Si hay cobranza) Morosidad: alumnos con saldo > 0

**Acciones rápidas**
- + Nuevo alumno
- Pasar lista
- Crear comunicado
- Importar CSV

---

## 2) Students (listado)
**Ruta:** `/:tenantSlug/students`

**Componentes**
- Tabla con columnas: Matrícula, Nombre, Grupo, Estatus, Tutor principal, Teléfono
- Buscador global (nombre/ID)
- Filtros: ciclo, grado, grupo, estatus
- Acciones bulk (P1): export, cambiar estatus

**Acciones**
- Ver alumno
- Editar
- Inscribir/Reinscribir (si no tiene enrollment activo)

---

## 3) Student Detail (expediente con tabs)
**Ruta:** `/:tenantSlug/students/[studentId]`

### Tabs sugeridos (MVP)
1. **Overview**
   - Datos principales, foto, estatus
   - Grupo actual, ciclo actual
   - “Quick actions”: Inscribir, Registrar incidencia (P1), Adjuntar documento
2. **Guardians**
   - Lista tutores vinculados + “Tutor principal”
3. **Enrollment**
   - Historial de inscripciones por ciclo, cambios y estatus
4. **Attendance**
   - Resumen mensual (%), lista de faltas/retardos
5. **Documents**
   - Archivos adjuntos con tags
6. **Activity**
   - Timeline tipo “Activity Calendar / Agenda” filtrable

> Nota: Esta tab de **Activity** es tu diferencial si queda bien implementada.

---

## 4) Enrollment (control escolar)
**Ruta:** `/:tenantSlug/enrollment`

**Vistas**
- Vista por ciclo (selector)
- Tabla: Alumno, grupo, estatus, fecha, responsable
- Botón: “Inscribir alumno”
- Wizard:
  1) Buscar/crear alumno
  2) Seleccionar ciclo + grado + grupo
  3) Confirmar (valida cupo)
  4) Genera activity event

**Puntos clave**
- Validación de cupos
- Cambios de grupo (P1) con trazabilidad

---

## 5) Attendance
**Ruta:** `/:tenantSlug/attendance`

### Sub-vistas
- `/:tenantSlug/attendance/take` (pasar lista)
- `/:tenantSlug/attendance/report` (reportes)

**Pasar lista (MVP)**
- Selector: fecha + grupo
- Lista alumnos (con quick toggles)
- Acciones:
  - Marcar todos presentes
  - Guardar
  - Adjuntar evidencia por alumno (P1)
- Permisos:
  - Editar después de X horas (configurable P1)
  - Solo Dirección puede cambiar faltas justificadas (P1)

**Reporte**
- Filtros: fecha rango, grupo, alumno
- Export CSV

---

## 6) Announcements (comunicados)
**Ruta:** `/:tenantSlug/announcements`

**MVP**
- Listado de comunicados (draft/published)
- Crear comunicado:
  - título, cuerpo, adjuntos (P1)
  - targets: toda la escuela / grado / grupo
- Publicar y registrar en activity log

---

## 7) Reports
**Ruta:** `/:tenantSlug/reports`

**MVP**
- Asistencia:
  - por grupo
  - por alumno
- Matrícula:
  - alumnos por grupo
  - altas/bajas por periodo (P1)
- Export CSV

> Consejo: Mantén pocos reportes pero muy útiles. El exceso abruma.

---

## 8) Activity (bitácora global)
**Ruta:** `/:tenantSlug/activity`

**Diseño recomendado (como tu UI)**
- Toggle: “Agenda” / “Calendario”
- Filtros:
  - fecha, tipo de evento, actor, alumno
- Tarjetas por evento:
  - icono + tipo (asistencia, inscripción, edición de datos, comunicado)
  - timestamp
  - link al objeto (alumno, grupo, etc.)

**Eventos MVP**
- student.created / student.updated
- guardian.linked
- enrollment.created / enrollment.updated
- attendance.taken / attendance.updated
- announcement.published
- import.completed / import.failed

---

## 9) Settings
**Ruta:** `/:tenantSlug/settings`

### Secciones (MVP)
- **School profile**: nombre, timezone, logo
- **Academic setup**: ciclos, periodos, grados, grupos, materias
- **Users & roles**: invitar usuario (P1), asignar roles
- **Import/Export**: importar alumnos/tutores, export alumnos

---

## Componentes UI reutilizables (te ahorran semanas)
- DataTable (server-side): búsqueda, filtros, paginación
- Modal Wizard (inscripción, importación)
- FileUploader con presigned URLs
- ActivityCard + ActivityTimeline
- PermissionGate (oculta UI según RBAC)
- Toast + confirm dialogs

---

## Flujos end-to-end del MVP (para validar producto)
1) **Setup de escuela**
   - Crear ciclo → grados → grupos → materias
2) **Cargar alumnos**
   - Import CSV + corrección de errores
3) **Inscribir**
   - Inscribir alumno a grupo → queda registro (activity)
4) **Operación diaria**
   - Pasar lista → reportes → activity
5) **Comunicación**
   - Comunicado → activity + notificación in-app

---

## Siguiente paso recomendado
Una vez tengas estas pantallas definidas:
- Diseña un **Design System mínimo** (botones, inputs, tablas)
- Implementa primero el **DataTable + filtros** y el **Activity feed**: son la base del resto.
