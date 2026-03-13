# M001: Bases Sólidas y Expedientes

## Vision
Construir y blindar los cimientos de la plataforma: autenticación multi-tenant real, configuración del ciclo escolar, registro de alumnos y personal, y adjuntar materiales para profesores.

## Success Criteria
- [ ] Login, sesión y roles funcionan correctamente por tenant.
- [ ] Se puede crear un ciclo escolar, grados, grupos y materias.
- [ ] CRUD básico de estudiantes, tutores y staff.
- [ ] Un profesor puede subir un archivo a un tema curricular en su planificador.

---

## Slices

- [x] **S01: RBAC y Multi-tenant Core** `risk:high` `depends:[]`
  > After this: El sistema tiene login funcional, protección de rutas y aísla datos usando `tenantId`.

- [x] **S02: Configuración Académica (CRUD)** `risk:low` `depends:[S01]`
  > After this: Un admin puede dar de alta un ciclo escolar, grados, grupos y asignar profesores a materias.

- [x] **S03: Gestión de Expedientes (Alumnos y Tutores)** `risk:medium` `depends:[S01, S02]`
  > After this: Un admin puede dar de alta a un estudiante, sus tutores y buscar en su expediente.

- [x] **S04: Planificador Docente: Archivos Adjuntos** `risk:medium` `depends:[S01]`
  > After this: Un profesor puede subir y ver archivos (PDF/PPT) vinculados a un tema en su planificador.

---

## Boundary Map

### S01 → S02, S03, S04
Produces: 
  middleware.ts/auth.ts → sesión activa, extracción de `tenantId`.
  Rutas protegidas base.
Consumes: nothing.

### S02 → S03
Produces:
  Grupos y ciclos escolares creados en DB.
Consumes: `tenantId` de S01.

### S04
Produces:
  Upload de archivos (server actions, storage local o cloud) asociado a modelo `Attachment`.
Consumes: `tenantId` y auth de S01.