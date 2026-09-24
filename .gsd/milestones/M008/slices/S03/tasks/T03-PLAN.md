---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T03: Verificación DB + UAT de Teacher Attendance

- Ejecutar seed.
- Login teacher.
- Ir a /teacher/classes, abrir clase, tomar asistencia.
- Verificar en DB: AttendanceSession creada y AttendanceRecord para alumnos.
- Escribir pasos UAT para slice.

## Inputs

- `Resultados T01-T02`

## Expected Output

- `UAT del slice + evidencia de persistencia`

## Verification

Checklist UAT ejecutable + query prisma confirma persistencia.
