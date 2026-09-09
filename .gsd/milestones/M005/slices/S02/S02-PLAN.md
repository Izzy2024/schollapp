# S02: Cierre de requirements: sincronización DB + status correcto + evidencia

**Goal:** Eliminar deriva entre `.gsd/REQUIREMENTS.md` y DB; alinear estados a roadmaps ejecutados y dejar un patrón de mantenimiento.
**Demo:** After this: `STATE.md` muestra conteos reales; R008 pasa a Validated (ya) y el resto queda alineado; gsd_requirement_update funciona.

## Tasks
- [x] **T01: Auditados requirements vs roadmaps M001–M004 y determinado status objetivo con evidencia por requirement.** — 1) Leer ROADMAPs M001–M004 y confirmar checkboxes [x].
2) Determinar qué requirements deben pasar a Validated (p.ej. R001–R008, R010 si aplica).
3) Identificar requirements que siguen Active (p.ej. R011 ahora se avanza/valida por S01).
4) Preparar notas/validation evidence por requirement (citar milestone/slice).
  - Estimate: 1-2h
  - Files: .gsd/REQUIREMENTS.md, .gsd/milestones/M00*/M00*-ROADMAP.md, .gsd/milestones/M005/slices/S01/S01-SUMMARY.md
  - Verify: N/A (análisis documental)
- [x] **T02: Sincronizados requirements al DB y aplicados updates con evidencia; REQUIREMENTS.md regenerado coherente.** — 1) Usar `gsd_requirement_update` para cada requirement a actualizar.
2) Asegurar `status` en minúsculas (active/validated/deferred/out-of-scope/blocked).
3) Pegar evidence en `validation` (cuando validated) y notas en `notes`.
4) Verificar que REQUIREMENTS.md se regeneró coherente con DB y que `gsd_requirement_update` ya funciona.
  - Estimate: 1-2h
  - Files: .gsd/REQUIREMENTS.md, .gsd/gsd.db, .gsd/STATE.md
  - Verify: sqlite3 .gsd/gsd.db "select id,status from requirements order by id;"
- [x] **T03: Registrado patrón/decisión de requirements en DB y verificado conteos; identificado STATE.md desactualizado como follow-up.** — 1) Confirmar `STATE.md` refleja conteos no cero (active/validated etc.) tras los updates.
2) Si STATE no se actualiza automáticamente, gatillar una re-render vía herramientas apropiadas (milestone validate/reassess) o documentar el patrón.
3) Registrar decisión en DECISIONS.md sobre 'DB como fuente de verdad' y cómo mantener REQUIREMENTS.

  - Estimate: 0.5-1h
  - Files: .gsd/STATE.md, .gsd/DECISIONS.md, .gsd/REQUIREMENTS.md
  - Verify: sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"
