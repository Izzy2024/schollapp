# S04 UAT: Planificador Docente — Archivos Adjuntos (M001)

## Objetivo
Validar que un docente puede adjuntar, ver y eliminar archivos (Attachment) en el planificador.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login teacher: `docente1@demo.com` / `demo-hash-123`

## Caso 1 — Abrir planificador
1. Ir a `/teacher/planning`.
2. Seleccionar materia y periodo (ej. Bimestre 1).
3. Expected: se muestran unidades y tópicos.

## Caso 2 — Adjuntar archivo
1. En un tópico, usar "Adjuntar archivo".
2. Seleccionar un archivo pequeño (PDF o imagen).
3. Expected: aparece en la lista de adjuntos del tópico.

## Caso 3 — Abrir archivo
1. Click en el nombre del archivo.
2. Expected: abre en nueva pestaña o descarga.

## Caso 4 — Eliminar archivo
1. Eliminar adjunto (icono basurero).
2. Confirmar.
3. Expected: desaparece de la lista.

## Señales de fallo
- El upload falla silenciosamente.
- El archivo queda accesible cross-tenant.
