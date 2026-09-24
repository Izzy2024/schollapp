---
estimated_steps: 4
estimated_files: 6
skills_used: []
---

# T02: Code mapping: localizar páginas/actions detrás de cada gap

- Para cada gap de T01, localizar el archivo exacto (page.tsx/client/action).
- Confirmar si es placeholder (En construcción) o error real.
- Identificar dependencias de datos (modelos) para arreglar rápido.
- Entregar tabla gap→ruta→archivo→tipo de fix.

## Inputs

- `.gsd/milestones/M008/slices/S01/tasks/T01-SUMMARY.md`
- `app/prisma/seed.ts`

## Expected Output

- `Tabla gap→file→fix type`

## Verification

`rg` + lectura puntual de archivos encontrados; confirmar que el gap se explica por el código localizado.
