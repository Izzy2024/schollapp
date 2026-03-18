---
id: S02
parent: M002
title: Inscripciones y Matrícula
status: pending
risk: high
depends: [S01]
provides:
  - Wizard de inscripción en `/director/enrollment`
  - Modelo `Enrollment` con ciclo, grado, grupo y estado
  - Validación de cupo por grupo
  - Activity event `enrollment.created`
key_screens:
  - /director/enrollment (listado por ciclo + wizard de inscripción)
  - /admin/students/[studentId] > tab Enrollment (historial)
---

# S02: Inscripciones y Matrícula

## Goal
Permitir que el control escolar inscriba y reinscriba alumnos a grupos, con validación de cupo y trazabilidad completa de cambios.

## Tasks (Estimated)
- **T01** — Modelo `Enrollment` en Prisma + Server Actions (`createEnrollment`, `getEnrollments`)
- **T02** — Pantalla `/director/enrollment` con tabla por ciclo, filtros y wizard de 3 pasos
- **T03** — Tab "Enrollment" en el expediente del alumno (`/admin/students/[id]`)
