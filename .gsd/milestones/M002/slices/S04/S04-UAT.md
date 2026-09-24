# S04 UAT: Comunicados Internos (M002)

## Objetivo
Validar que Director/Admin puede crear, publicar y borrar comunicados con targets (escuela/grado/grupo).

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login Director: `director@demo.com` / `demo-hash-123` (o Admin)

## Caso 1 — Crear comunicado para toda la escuela
1. Ir a `/director/announcements`.
2. Crear comunicado (título + cuerpo) target "Toda la escuela".
3. Publicar.
4. Expected: aparece como Publicado.

## Caso 2 — Target por grado/grupo
1. Crear comunicado target "Un grado".
2. Crear comunicado target "Un grupo".
3. Expected: quedan publicados y con resumen de target correcto.

## Caso 3 — Eliminar
1. Eliminar un comunicado.
2. Expected: desaparece de la lista.

## Señales de fallo
- No se aplican targets correctamente.
- Errores silenciosos (sin mensaje estable).
