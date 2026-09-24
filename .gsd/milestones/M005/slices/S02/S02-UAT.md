# S02: Cierre de requirements: sincronización DB + status correcto + evidencia — UAT

**Milestone:** M005
**Written:** 2026-03-26T20:57:53.066Z

# UAT: S02 Requirements sync

## Objetivo
Confirmar que requirements y DB están alineados y que las herramientas funcionan.

## Checks
1. Ejecutar:
   - `sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"`
   - Expected: `validated|11`
2. Abrir `.gsd/REQUIREMENTS.md`.
   - Expected: R001–R011 en sección Validated con evidencia.
3. Actualizar un requirement de prueba (sin cambiar status) usando `gsd_requirement_update` (por ejemplo, agregar una nota) y verificar que el archivo se regenera.

## Señales de fallo
- `gsd_requirement_update` devuelve “Requirement not found”.
- Conteos DB no coinciden con lo visible en REQUIREMENTS.

