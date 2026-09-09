# S02 UAT: Configuración Académica (CRUD) (M001)

## Objetivo
Validar CRUD y activación de ciclo escolar, grados, secciones y sus validaciones básicas.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login Admin: `admin@demo.com` / `demo-hash-123`

## Caso 1 — Navegación al módulo
1. Ir a `/admin/academic`.
2. Expected: se ven secciones/tarjetas para Ciclos, Grados, Secciones.

## Caso 2 — Crear y activar ciclo
1. Crear ciclo "2027-2028" (fechas válidas).
2. Expected: aparece en lista.
3. Marcar como Activo.
4. Expected: queda como activo (etiqueta/estado visible).

## Caso 3 — Crear grado
1. Crear grado "4° Secundaria" (código "4S").
2. Expected: aparece en lista.

## Caso 4 — Crear sección
1. Crear sección "C" con capacidad 25, asociada al ciclo activo y grado creado.
2. Expected: aparece en la tabla.
3. Intentar borrar sección recién creada sin alumnos.
4. Expected: se permite borrar.

## Señales de fallo
- Se permite borrar secciones con alumnos inscritos (debería bloquear).
- CRUD afecta registros de otro tenant.
