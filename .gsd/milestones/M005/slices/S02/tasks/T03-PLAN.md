---
estimated_steps: 3
estimated_files: 3
skills_used: []
---

# T03: Actualizar STATE y validar conteos; registrar decisión/patrón de sync

1) Confirmar `STATE.md` refleja conteos no cero (active/validated etc.) tras los updates.
2) Si STATE no se actualiza automáticamente, gatillar una re-render vía herramientas apropiadas (milestone validate/reassess) o documentar el patrón.
3) Registrar decisión en DECISIONS.md sobre 'DB como fuente de verdad' y cómo mantener REQUIREMENTS.

## Inputs

- `DB después de updates`

## Expected Output

- `STATE coherente`
- `Decisión registrada`

## Verification

sqlite3 .gsd/gsd.db "select status,count(*) from requirements group by status;"

## Observability Impact

Evitar deriva futura.
