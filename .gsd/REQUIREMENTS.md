# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — Autenticación y Multi-tenant (RBAC)
- Status: validated
- Description: Autenticación y Multi-tenant (RBAC)
- Source: User/Plan
- Primary owning slice: M001
- Supporting slices: []
- Validation: M001 completo (S01 en [x]): RBAC + multi-tenant core con sesión y aislamiento por tenantId. Evidencia: .gsd/milestones/M001/M001-ROADMAP.md
- Notes: Validación documental basada en roadmap completado; verificación runtime ya usada por múltiples milestones posteriores (M002–M005) que consumen tenant/RBAC.

### R002 — Configuración Académica (Ciclos, Grupos, Materias)
- Status: validated
- Description: Configuración Académica (Ciclos, Grupos, Materias)
- Source: User/Plan
- Primary owning slice: M001
- Supporting slices: []
- Validation: M001 completo (S02 en [x]): configuración académica CRUD (ciclo, grados, grupos, materias, asignaciones). Evidencia: .gsd/milestones/M001/M001-ROADMAP.md
- Notes: Validación documental basada en roadmap completado.

### R003 — Expedientes (Alumnos, Tutores, Personal)
- Status: validated
- Description: Expedientes (Alumnos, Tutores, Personal)
- Source: User/Plan
- Primary owning slice: M001
- Supporting slices: []
- Validation: M001 completo (S03 en [x]): gestión de expedientes (alumnos y tutores) con CRUD y búsqueda. Evidencia: .gsd/milestones/M001/M001-ROADMAP.md
- Notes: Validación documental; M002/M003 consumen estas entidades.

### R004 — Flujo de Inscripción / Reinscripción
- Status: validated
- Description: Flujo de Inscripción / Reinscripción
- Source: User/Plan
- Primary owning slice: M002
- Supporting slices: []
- Validation: M002 completo (S02 en [x]): flujo inscripción/reinscripción con validación de cupo y trazabilidad. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md
- Notes: Validación documental basada en M002 S02 completado; cubre inscripción/reinscripción con validación de cupo.

### R005 — Control de Asistencia Diaria y Reportes
- Status: validated
- Description: Control de Asistencia Diaria y Reportes
- Source: User/Plan
- Primary owning slice: M002
- Supporting slices: []
- Validation: M002 completo (S03 en [x]): control de asistencia diaria + reportes básicos. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md
- Notes: Validación documental basada en M002 S03 completado; existen suites de pruebas e integración en milestones posteriores.

### R006 — Bitácora (Activity Log) y Trazabilidad
- Status: validated
- Description: Bitácora (Activity Log) y Trazabilidad
- Source: User/Plan
- Primary owning slice: M002
- Supporting slices: []
- Validation: M002 completo (S05 en [x]): bitácora global (Activity feed) y trazabilidad; consumida/extensible en M003 finance.* y M004 communication.*. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md
- Notes: Validación documental; Activity feed consolidado en M002 S05 y extendido en M003/M004.

### R007 — Cobranza Básica (Conceptos, Pagos, Estado de Cuenta)
- Status: validated
- Description: Cobranza Básica (Conceptos, Pagos, Estado de Cuenta)
- Source: User/Plan
- Primary owning slice: M003
- Supporting slices: []
- Validation: M003 completo (S01–S05 en [x]): conceptos+cargos idempotentes, pagos manuales, estado de cuenta parent real, eventos finance.* en Activity, gates lint/test/build. Evidencia: .gsd/milestones/M003/M003-ROADMAP.md
- Notes: Se completa evidencia de validación para R007 basada en roadmap ejecutado.

### R008 — Comunicación (Anuncios y Mensajería)
- Status: validated
- Description: Comunicación (Anuncios y Mensajería)
- Source: User/Plan
- Primary owning slice: M003
- Supporting slices: []
- Validation: M004 completado (S01–S03 en [x]): modelo + server actions + contract tests; UI inbox/thread con unread determinista; ActivityEvent communication.message.sent sin PII; smoke con lint/test/build. Evidencia: .gsd/milestones/M004/M004-ROADMAP.md
- Notes: Se sincronizó requirements al DB desde REQUIREMENTS.md; este update alinea el estado con el roadmap de M004.

### R009 — Estabilización y Tipado Estricto
- Status: validated
- Description: Estabilización y Tipado Estricto
- Source: Execution
- Primary owning slice: M003
- Supporting slices: []
- Validation: M003 completo (S04 en [x]): estabilización + suite de verificación sin mock.module; lint/test/build pasan. Evidencia: .gsd/milestones/M003/M003-ROADMAP.md
- Notes: Se completa evidencia de validación para R009 basada en roadmap ejecutado.

### R010 — Planificador Docente: Adjuntar Materiales (PDF, PPT, Word)
- Status: validated
- Description: Planificador Docente: Adjuntar Materiales (PDF, PPT, Word)
- Source: User
- Primary owning slice: M001
- Supporting slices: []
- Validation: M001 completo (S04 en [x]): planificador docente con archivos adjuntos (Attachment). Evidencia: .gsd/milestones/M001/M001-ROADMAP.md
- Notes: R010 coincide con S04 de M001 (adjuntos). Se valida por roadmap ejecutado.

### R011 — Calendario Escolar Sincronizado Globalmente
- Status: validated
- Description: Calendario Escolar Sincronizado Globalmente
- Source: User
- Primary owning slice: M002
- Supporting slices: []
- Validation: M005/S01 completo: Calendario global tenant-scoped (`SchoolCalendarEvent`) + server actions + UI `/admin/calendar`, `/teacher/calendar`, `/parent/calendar` + tests `calendar.contract.test.ts`. Evidencia: .gsd/milestones/M005/slices/S01/S01-SUMMARY.md
- Notes: Implementado y probado en M005/S01 (modelo+acciones+UI por rol + contract tests).

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 |  | validated | M001 | [] | M001 completo (S01 en [x]): RBAC + multi-tenant core con sesión y aislamiento por tenantId. Evidencia: .gsd/milestones/M001/M001-ROADMAP.md |
| R002 |  | validated | M001 | [] | M001 completo (S02 en [x]): configuración académica CRUD (ciclo, grados, grupos, materias, asignaciones). Evidencia: .gsd/milestones/M001/M001-ROADMAP.md |
| R003 |  | validated | M001 | [] | M001 completo (S03 en [x]): gestión de expedientes (alumnos y tutores) con CRUD y búsqueda. Evidencia: .gsd/milestones/M001/M001-ROADMAP.md |
| R004 |  | validated | M002 | [] | M002 completo (S02 en [x]): flujo inscripción/reinscripción con validación de cupo y trazabilidad. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md |
| R005 |  | validated | M002 | [] | M002 completo (S03 en [x]): control de asistencia diaria + reportes básicos. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md |
| R006 |  | validated | M002 | [] | M002 completo (S05 en [x]): bitácora global (Activity feed) y trazabilidad; consumida/extensible en M003 finance.* y M004 communication.*. Evidencia: .gsd/milestones/M002/M002-ROADMAP.md |
| R007 |  | validated | M003 | [] | M003 completo (S01–S05 en [x]): conceptos+cargos idempotentes, pagos manuales, estado de cuenta parent real, eventos finance.* en Activity, gates lint/test/build. Evidencia: .gsd/milestones/M003/M003-ROADMAP.md |
| R008 |  | validated | M003 | [] | M004 completado (S01–S03 en [x]): modelo + server actions + contract tests; UI inbox/thread con unread determinista; ActivityEvent communication.message.sent sin PII; smoke con lint/test/build. Evidencia: .gsd/milestones/M004/M004-ROADMAP.md |
| R009 |  | validated | M003 | [] | M003 completo (S04 en [x]): estabilización + suite de verificación sin mock.module; lint/test/build pasan. Evidencia: .gsd/milestones/M003/M003-ROADMAP.md |
| R010 |  | validated | M001 | [] | M001 completo (S04 en [x]): planificador docente con archivos adjuntos (Attachment). Evidencia: .gsd/milestones/M001/M001-ROADMAP.md |
| R011 |  | validated | M002 | [] | M005/S01 completo: Calendario global tenant-scoped (`SchoolCalendarEvent`) + server actions + UI `/admin/calendar`, `/teacher/calendar`, `/parent/calendar` + tests `calendar.contract.test.ts`. Evidencia: .gsd/milestones/M005/slices/S01/S01-SUMMARY.md |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 11 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011)
- Unmapped active requirements: 0
