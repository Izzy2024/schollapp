# S02 UAT: Inscripciones y Matrícula (M002)

## Objetivo
Validar inscripción/reinscripción con validación de cupo y consistencia de matrícula.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login Admin: `admin@demo.com` / `demo-hash-123`

## Caso 1 — Inscribir alumno a grupo
1. Ir a `/admin/enrollment`.
2. Seleccionar un alumno (ej. STD-001) y un grupo (ej. 1° Primaria A).
3. Confirmar inscripción.
4. Expected: se crea enrollment y aparece en listados.

## Caso 2 — Validación de cupo
1. Seleccionar un grupo con capacidad baja (si hay UI para editarla) o saturarlo inscribiendo múltiples alumnos.
2. Intentar inscribir cuando excede cupo.
3. Expected: error estable/visible (no inscripción parcial).

## Señales de fallo
- Inscripción duplicada para mismo alumno+ciclo.
- Se inscribe fuera del tenant derivado de sesión.
