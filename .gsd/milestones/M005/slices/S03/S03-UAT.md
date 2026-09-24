# S03: UAT real + Runbook post-lanzamiento (reemplaza placeholders) — UAT

**Milestone:** M005
**Written:** 2026-03-26T21:06:02.833Z

# UAT: S03 Docs & Runbook

## Precondiciones
- Repo con `.gsd/` actualizado.

## Caso 1 — No hay UAT placeholders
1. Ejecutar: `rg -n "Recovery placeholder UAT" .gsd/milestones -S --files-with-matches`
2. Expected: solo resultados en planes de S03 (no en UATs).

## Caso 2 — Runbook existe
1. Abrir `.gsd/milestones/M005/M005-RUNBOOK.md`
2. Expected: contiene smoke checklist por rol y diagnóstico de login.

## Caso 3 — Referencias consistentes
1. Confirmar decisión D009 en `.gsd/DECISIONS.md`.
2. Confirmar health check `validated|11` en el runbook.

