---
id: S03
parent: M002
title: Control de Asistencia
status: pending
risk: medium
depends: [S02]
provides:
  - Pasar lista por grupo y fecha en `/teacher/attendance` y `/admin/attendance`
  - Modelo `Attendance` con estados (present/absent/late/excused)
  - Reporte de asistencia por grupo y por alumno
  - Export CSV de asistencia
key_screens:
  - /teacher/attendance (pasar lista — vista docente)
  - /admin/attendance (vista admin + reporte)
  - /admin/students/[studentId] > tab Attendance
---

# S03: Control de Asistencia

## Goal
Habilitar el pase de lista diario por grupo. Cualquier docente o admin puede registrar presencias, ausencias y retardos. El sistema permite consultar el historial y generar reportes.

## Tasks (Estimated)
- **T01** — Modelo `Attendance` en Prisma + Server Actions (`saveAttendance`, `getAttendanceByGroup`, `getAttendanceByStudent`)
- **T02** — Pantalla `/teacher/attendance`: selector de grupo+fecha, lista de alumnos con toggles y guardado
- **T03** — Pantalla `/admin/attendance`: reporte con filtros rango de fechas + grupo + alumno y export CSV
- **T04** — Tab "Attendance" en el expediente del alumno con resumen mensual
