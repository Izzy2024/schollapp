# S03 UAT: Gestión de Expedientes (Alumnos y Tutores) (M001)

## Objetivo
Validar CRUD de estudiantes y vinculación de tutores (familia) en el expediente.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login Admin: `admin@demo.com` / `demo-hash-123`

## Caso 1 — Listado y búsqueda
1. Ir a `/admin/students`.
2. Expected: lista con alumnos del seed.
3. Usar búsqueda "Ana".
4. Expected: filtra resultados.

## Caso 2 — Crear estudiante
1. Click "Nuevo Alumno".
2. Capturar nombre y apellidos.
3. Dejar matrícula en blanco.
4. Guardar.
5. Expected: aparece en lista y tiene matrícula generada.

## Caso 3 — Ver expediente y tutores
1. Abrir expediente (acción ver/detalle).
2. Ir a pestaña "Tutores / Familia".
3. Añadir tutor (nombre, parentesco, teléfono) y marcar como principal.
4. Expected: aparece vinculado con etiqueta de principal.
5. Desvincular tutor.
6. Expected: se elimina el vínculo.

## Señales de fallo
- No se genera matrícula al crear.
- Se permite vincular tutor a alumno de otro tenant.
