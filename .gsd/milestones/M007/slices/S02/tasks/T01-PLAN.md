---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T01: Repro y diagnóstico: login sin seed → CallbackRouteError

- Preparar repro: simular DB vacía (mover dev.db o reset) sin correr seed.
- Intentar login y capturar error exacto (server logs + UI).
- Identificar dónde se envuelve como CallbackRouteError.
- Registrar el punto de interceptación más estable.

## Inputs

- `.gsd/milestones/M007/slices/S01/S01-SUMMARY.md`
- `app/dev.db (estado actual)`

## Expected Output

- `Repro steps exactos`
- `Ubicación del throw/handle a interceptar`
- `Log/evidencia del error actual`

## Verification

Con DB vacía, intentar login y confirmar que hoy ocurre el error (antes del fix).
