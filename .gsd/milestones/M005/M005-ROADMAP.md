# M005: 

## Vision
Cerrar los pendientes estructurales del MVP y dejar el producto operable post-lanzamiento: (1) calendario escolar global sincronizado, (2) convertir requirements históricos a validated con evidencia, (3) reemplazar placeholders de UAT por scripts reales, y (4) hardening operacional (runbook + checks) sin agregar features grandes fuera de alcance.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Calendario Escolar Global (modelo + acciones + UI mínima + tests) | high | — | ✅ | Admin crea eventos del calendario; Teacher/Parent ven la vista de calendario con los eventos correctos y tenant-scoped. |
| S02 | Cierre de requirements: sincronización DB + status correcto + evidencia | medium | S01 | ✅ | `STATE.md` muestra conteos reales; R008 pasa a Validated (ya) y el resto queda alineado; gsd_requirement_update funciona. |
| S03 | UAT real + Runbook post-lanzamiento (reemplaza placeholders) | low | S02 | ✅ | Existe un checklist de smoke y UAT scripts ejecutables para módulos clave. |
