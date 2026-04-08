# S03: UAT real + Runbook post-lanzamiento (reemplaza placeholders)

**Goal:** Dejar verificaciones humanas reproducibles y documentación mínima operativa.
**Demo:** After this: Existe un checklist de smoke y UAT scripts ejecutables para módulos clave.

## Tasks
- [x] **T01: Reemplazados todos los UAT placeholders detectados en milestones M001–M003 y actualizado M002/S05 UAT.** — 1) Buscar archivos `*-UAT.md` con texto placeholder (por ejemplo “Recovery placeholder UAT”).
2) Para cada uno: leer el slice plan + summaries para entender el flujo real.
3) Reescribir el UAT con pasos ejecutables: precondiciones, usuarios, rutas, expected results, señales de fallo.
4) Verificar que no queden placeholders.
  - Estimate: 1-2h
  - Files: .gsd/milestones/**/slices/**/**-UAT.md, .gsd/milestones/**/slices/**/**-PLAN.md, .gsd/milestones/**/slices/**/**-SUMMARY.md
  - Verify: rg -n "placeholder" .gsd/milestones -S
- [x] **T02: Escrito runbook post-lanzamiento (smoke + diagnóstico) para módulos clave, incluyendo seed y requirements health checks.** — 1) Crear `M005-RUNBOOK.md` (o equivalente en milestones/M005/) con:
   - Smoke checklist por rol (admin/director/teacher/parent)
   - Rutas clave: /login, /admin/enrollment, /admin/attendance, /admin/finances, /admin/messages, /admin/calendar, /director/overview, /parent/finances, /parent/messages, /parent/calendar, /teacher/planning, /teacher/messages, /teacher/calendar
   - Qué esperar ver (datos seeded) y qué errores estables son aceptables.
   - Dónde ver Activity y qué eventos existen (finance.*, communication.*).
2) Incluir nota operativa de seed (`node prisma/seed.ts`) y cómo resetear dev.db si aplica.

  - Estimate: 1-2h
  - Files: .gsd/milestones/M005/M005-RUNBOOK.md, .gsd/REQUIREMENTS.md, app/prisma/seed.ts
  - Verify: test -f .gsd/milestones/M005/M005-RUNBOOK.md
- [x] **T03: Verificada consistencia de documentación (runbook, decision D009, no placeholders) y registrada limitación de STATE.md.** — 1) Asegurar que UAT nuevos y runbook referencien rutas reales y usuarios demo.
2) Verificar que REQUIREMENTS.md refleja validaciones y que decisión D009 existe.
3) Si `STATE.md` sigue desfasado, documentarlo en el runbook como limitación (sin tocar archivos system-managed).
  - Estimate: 0.5-1h
  - Files: .gsd/REQUIREMENTS.md, .gsd/DECISIONS.md, .gsd/milestones/M005/M005-RUNBOOK.md, .gsd/STATE.md
  - Verify: rg -n "D009|DB.*fuente de verdad" .gsd/DECISIONS.md && rg -n "validated\|11" -S .gsd/milestones/M005/M005-RUNBOOK.md || true
