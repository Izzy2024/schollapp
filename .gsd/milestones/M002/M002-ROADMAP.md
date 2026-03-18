# M002: Operación Diaria y Control Escolar

## Vision
Permitir a las escuelas operar su ciclo diario completo: inscripciones, asistencia por grupo, comunicados internos, bitácora global de actividad y reportes básicos de matrícula.

## Success Criteria
- [ ] Un alumno puede ser inscrito/reinscrito en un grupo con validación de cupo.
- [ ] Un docente puede pasar lista por grupo desde la plataforma.
- [ ] El director puede ver un reporte de asistencia por grupo y por alumno.
- [ ] Se puede publicar un comunicado visible por grado/grupo/escuela.
- [ ] Existe una bitácora (activity feed) con eventos clave del sistema.

---

## Slices

- [x] **S01: Ajustes de UI y Mantenimiento de Docentes** `risk:low` `depends:[M001]`
  > After this: Logout funcional, demo auto-login, perfil global `/profile` y CRUD de Staff en `/admin/staff`.

- [x] **S02: Inscripciones y Matrícula** `risk:high` `depends:[S01]`
  > After this: El control escolar puede inscribir y reinscribir alumnos a grupos con validación de cupo y trazabilidad.

- [ ] **S03: Control de Asistencia** `risk:medium` `depends:[S02]`
  > After this: Un profesor/admin puede pasar lista por fecha y grupo; el sistema guarda presencias/ausencias/retardos y genera reportes básicos.

- [ ] **S04: Comunicados Internos** `risk:low` `depends:[S01]`
  > After this: El director puede redactar y publicar comunicados dirigidos a toda la escuela, un grado o un grupo.

- [ ] **S05: Bitácora Global y Dashboard (Overview)** `risk:medium` `depends:[S02, S03, S04]`
  > After this: Existe un activity feed centralizado y el dashboard de Overview muestra métricas en tiempo real (matrícula, asistencia hoy, pendientes).

---

## Boundary Map

### S01 → S02, S03, S04, S05
Produces:
  Roles, sesiones y aislamiento multi-tenant.
  CRUD de Staff (Docentes).
Consumes: M001 completo.

### S02 → S03, S05
Produces:
  Modelo `Enrollment` con ciclo, grado, grupo y estado.
  Validación de cupo.
Consumes: `tenantId`, grupos y ciclos de M001/S02.

### S03 → S05
Produces:
  Modelo `Attendance` con registros por alumno, fecha, grupo y estado.
Consumes: `Enrollment` de S02, `tenantId`, grupos.

### S04 → S05
Produces:
  Modelo `Announcement` con targets y publicación.
Consumes: `tenantId`, roles de M001.

### S05
Produces:
  Activity feed unificado y widgets del Overview.
Consumes: datos de S02, S03 y S04.
