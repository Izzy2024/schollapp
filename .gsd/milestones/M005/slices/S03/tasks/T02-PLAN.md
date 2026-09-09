---
estimated_steps: 6
estimated_files: 3
skills_used: []
---

# T02: Escribir RUNBOOK post-lanzamiento (smoke + diagnóstico)

1) Crear `M005-RUNBOOK.md` (o equivalente en milestones/M005/) con:
   - Smoke checklist por rol (admin/director/teacher/parent)
   - Rutas clave: /login, /admin/enrollment, /admin/attendance, /admin/finances, /admin/messages, /admin/calendar, /director/overview, /parent/finances, /parent/messages, /parent/calendar, /teacher/planning, /teacher/messages, /teacher/calendar
   - Qué esperar ver (datos seeded) y qué errores estables son aceptables.
   - Dónde ver Activity y qué eventos existen (finance.*, communication.*).
2) Incluir nota operativa de seed (`node prisma/seed.ts`) y cómo resetear dev.db si aplica.

## Inputs

- `S01/S02 summaries`
- `Routes list from next build output`

## Expected Output

- `Runbook reproducible post-lanzamiento`

## Verification

test -f .gsd/milestones/M005/M005-RUNBOOK.md

## Observability Impact

Reduce tiempo de diagnóstico post-release.
