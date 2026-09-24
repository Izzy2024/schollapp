---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T01: Auditar y reemplazar placeholders de UAT existentes

1) Buscar archivos `*-UAT.md` con texto placeholder (por ejemplo “Recovery placeholder UAT”).
2) Para cada uno: leer el slice plan + summaries para entender el flujo real.
3) Reescribir el UAT con pasos ejecutables: precondiciones, usuarios, rutas, expected results, señales de fallo.
4) Verificar que no queden placeholders.

## Inputs

- `Plantillas UAT existentes`

## Expected Output

- `UAT reales en slices que tenían placeholder`

## Verification

rg -n "placeholder" .gsd/milestones -S

## Observability Impact

UAT reproducible y útil.
