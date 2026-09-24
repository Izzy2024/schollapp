# S03 UAT: Control de Asistencia (M002)

## Objetivo
Validar toma de asistencia por grupo/fecha y reportes básicos.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login teacher: `docente1@demo.com` / `demo-hash-123` (o Admin)

## Caso 1 — Pasar lista
1. Ir a `/admin/attendance` (admin) o superficie docente equivalente.
2. Seleccionar grupo y fecha (hoy).
3. Marcar algunos alumnos como ausente/retardo.
4. Guardar.
5. Expected: se guardan registros y al refrescar persisten.

## Caso 2 — Reportes
1. Ir a `/admin/reports`.
2. Buscar reporte de asistencia por grupo o alumno.
3. Expected: refleja los cambios del caso 1.

## Señales de fallo
- Los cambios no persisten.
- Se mezcla asistencia entre grupos/fechas.
