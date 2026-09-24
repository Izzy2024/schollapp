---
estimated_steps: 3
estimated_files: 4
skills_used: []
---

# T03: Verificación final de documentación (consistencia + links)

1) Asegurar que UAT nuevos y runbook referencien rutas reales y usuarios demo.
2) Verificar que REQUIREMENTS.md refleja validaciones y que decisión D009 existe.
3) Si `STATE.md` sigue desfasado, documentarlo en el runbook como limitación (sin tocar archivos system-managed).

## Inputs

- `Artifacts generados`

## Expected Output

- `Docs coherentes; nota sobre STATE si aplica`

## Verification

rg -n "D009|DB.*fuente de verdad" .gsd/DECISIONS.md && rg -n "validated\|11" -S .gsd/milestones/M005/M005-RUNBOOK.md || true

## Observability Impact

Evita sorpresas al correr UAT/smoke.
