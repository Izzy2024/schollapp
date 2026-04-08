---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T02: Aplicar updates a requirements en DB + regenerar REQUIREMENTS.md coherente

1) Usar `gsd_requirement_update` para cada requirement a actualizar.
2) Asegurar `status` en minúsculas (active/validated/deferred/out-of-scope/blocked).
3) Pegar evidence en `validation` (cuando validated) y notas en `notes`.
4) Verificar que REQUIREMENTS.md se regeneró coherente con DB y que `gsd_requirement_update` ya funciona.

## Inputs

- `Salida T01`

## Expected Output

- `REQUIREMENTS.md coherente con DB`
- `Updates aplicados con evidencia`

## Verification

sqlite3 .gsd/gsd.db "select id,status from requirements order by id;"

## Observability Impact

Herramientas GSD operables.
