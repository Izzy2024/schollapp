---
id: T03
parent: S02
milestone: M008
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/enrollment/EnrollmentClient.tsx", "app/src/actions/enrollment-ui.ts", "app/src/actions/enrollment-client.ts", "app/src/actions/enrollment-impl.ts"]
key_decisions: ["Mantener reenroll como fallback demoable cuando seed ya inscribió a todos.", "Mantener boundary server-actions (solo async exports) para evitar errores de Next."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs`
- Browser: `/admin/enrollment` muestra Inscripción rápida; ya no aparece el texto crudo `{name: ...}`
- `cd app && npm test`"
completed_at: 2026-03-27T21:46:05.012Z
blocker_discovered: false
---

# T03: Ajusté la UI de enrollment para evitar basura serializada de errores y dejé verificación/UAT base para el flujo admin.

> Ajusté la UI de enrollment para evitar basura serializada de errores y dejé verificación/UAT base para el flujo admin.

## What Happened
---
id: T03
parent: S02
milestone: M008
key_files:
  - app/src/app/admin/enrollment/EnrollmentClient.tsx
  - app/src/actions/enrollment-ui.ts
  - app/src/actions/enrollment-client.ts
  - app/src/actions/enrollment-impl.ts
key_decisions:
  - Mantener reenroll como fallback demoable cuando seed ya inscribió a todos.
  - Mantener boundary server-actions (solo async exports) para evitar errores de Next.
duration: ""
verification_result: passed
completed_at: 2026-03-27T21:46:05.013Z
blocker_discovered: false
---

# T03: Ajusté la UI de enrollment para evitar basura serializada de errores y dejé verificación/UAT base para el flujo admin.

**Ajusté la UI de enrollment para evitar basura serializada de errores y dejé verificación/UAT base para el flujo admin.**

## What Happened

Se limpió el comportamiento visible en `/admin/enrollment` para que sea apto para demo: se eliminó la aparición de texto crudo serializado (`{name: ..., code: ..., message: ..., digest: ...}`) que venía de errores RSC y se estabilizó el entorno de ejecución dejando un solo dev server sano.

Verificación: se ejecutó seed y se navegó a `/admin/enrollment` confirmando que la pantalla muestra “Inscripción rápida” y que los selects cargan opciones. Se ejecutó `npm test` y pasó.

UAT: se dejó el checklist base de admin enrollment (seed → login admin → abrir inscripciones → ejecutar acción).

## Verification

- `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs`
- Browser: `/admin/enrollment` muestra Inscripción rápida; ya no aparece el texto crudo `{name: ...}`
- `cd app && npm test`

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && npm test` | 0 | ✅ pass | 1624158ms |
| 2 | `Browser manual: /admin/enrollment loads and no '{name: ...}' visible` | 0 | ✅ pass | 30000ms |


## Deviations

La UX del mensaje de éxito tras reinscripción depende del estado (si el alumno ya está inscrito); se dejó como path demoable, pero conviene una confirmación visual más explícita en una iteración posterior.

## Known Issues

La acción de reinscripción se ejecuta pero el mensaje de éxito no se validó con una aserción automatizada consistente (posible re-render); requiere pulido adicional para demo perfecto.

## Files Created/Modified

- `app/src/app/admin/enrollment/EnrollmentClient.tsx`
- `app/src/actions/enrollment-ui.ts`
- `app/src/actions/enrollment-client.ts`
- `app/src/actions/enrollment-impl.ts`


## Deviations
La UX del mensaje de éxito tras reinscripción depende del estado (si el alumno ya está inscrito); se dejó como path demoable, pero conviene una confirmación visual más explícita en una iteración posterior.

## Known Issues
La acción de reinscripción se ejecuta pero el mensaje de éxito no se validó con una aserción automatizada consistente (posible re-render); requiere pulido adicional para demo perfecto.
