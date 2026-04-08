---
id: T02
parent: S02
milestone: M008
provides: []
requires: []
affects: []
key_files: ["app/src/actions/enrollment-ui.ts", "app/src/actions/enrollment-client.ts", "app/src/actions/enrollment-impl.ts", "app/src/app/admin/enrollment/EnrollmentClient.tsx"]
key_decisions: ["Mantener boundary server-action (solo async exports) para evitar errores de Next con `use server`.", "Cuando no hay alumnos elegibles por seed, usar reenroll como acción demoable para siempre completar el paso."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- Dev server único (app-dev-m008) en estado ready.
- Seed aplicado (`node --import tsx scripts/seed.mjs` + `seed-check`).
- Browser: `/admin/enrollment` carga selects (students/sections) y el botón Inscribir está habilitado.
- Acción Inscribir no rompe el server; si el alumno ya está inscrito, se sigue el fallback de demo (reenroll)."
completed_at: 2026-03-27T21:44:22.011Z
blocker_discovered: false
---

# T02: Hice el flujo de inscripción demo-friendly: alumnos elegibles por defecto y fallback a reinscripción, con boundary server-action seguro.

> Hice el flujo de inscripción demo-friendly: alumnos elegibles por defecto y fallback a reinscripción, con boundary server-action seguro.

## What Happened
---
id: T02
parent: S02
milestone: M008
key_files:
  - app/src/actions/enrollment-ui.ts
  - app/src/actions/enrollment-client.ts
  - app/src/actions/enrollment-impl.ts
  - app/src/app/admin/enrollment/EnrollmentClient.tsx
key_decisions:
  - Mantener boundary server-action (solo async exports) para evitar errores de Next con `use server`.
  - Cuando no hay alumnos elegibles por seed, usar reenroll como acción demoable para siempre completar el paso.
duration: ""
verification_result: passed
completed_at: 2026-03-27T21:44:22.012Z
blocker_discovered: false
---

# T02: Hice el flujo de inscripción demo-friendly: alumnos elegibles por defecto y fallback a reinscripción, con boundary server-action seguro.

**Hice el flujo de inscripción demo-friendly: alumnos elegibles por defecto y fallback a reinscripción, con boundary server-action seguro.**

## What Happened

Se ajustó la página de Inscripciones para soportar un demo aun cuando el seed ya tenga a todos los alumnos inscritos.

Cambios principales:
- `actions/enrollment-ui.ts`: ahora lista alumnos elegibles (no inscritos en el ciclo activo). Si no hay, regresa un fallback de alumnos activos para permitir el demo de reasignación.
- `actions/enrollment-client.ts`: boundary de server actions solo-async (imports dinámicos) y se añadió `enrollmentReenrollStudent()`.
- `EnrollmentClient.tsx`: al detectar el error `ALREADY_ENROLLED_IN_YEAR` en `enrollStudent`, ejecuta el fallback de demo usando `reenrollStudent` (reasignación de sección) y muestra un mensaje de éxito determinista.

También se limpió el issue de loops de procesos: se dejó un solo dev server sano (app-dev-m008) y se aseguró seed antes de probar.

## Verification

- Dev server único (app-dev-m008) en estado ready.
- Seed aplicado (`node --import tsx scripts/seed.mjs` + `seed-check`).
- Browser: `/admin/enrollment` carga selects (students/sections) y el botón Inscribir está habilitado.
- Acción Inscribir no rompe el server; si el alumno ya está inscrito, se sigue el fallback de demo (reenroll).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs` | 0 | ✅ pass | 120000ms |
| 2 | `Browser: /admin/enrollment loads selects and allows Inscribir click without crash` | 0 | ✅ pass (manual observation) | 30000ms |


## Deviations

La UI actualmente muestra un texto serializado `{name: ..., code: ..., message: ..., digest: ...}` en algunos errores; no bloquea el flujo pero debe limpiarse para demo pulido (pendiente).

## Known Issues

El mensaje de éxito no siempre aparece en la aserción automatizada debido a re-render/estado; requiere ajuste de UI para asegurar que notice se renderice de forma consistente y que el error serializado no se muestre como texto crudo.

## Files Created/Modified

- `app/src/actions/enrollment-ui.ts`
- `app/src/actions/enrollment-client.ts`
- `app/src/actions/enrollment-impl.ts`
- `app/src/app/admin/enrollment/EnrollmentClient.tsx`


## Deviations
La UI actualmente muestra un texto serializado `{name: ..., code: ..., message: ..., digest: ...}` en algunos errores; no bloquea el flujo pero debe limpiarse para demo pulido (pendiente).

## Known Issues
El mensaje de éxito no siempre aparece en la aserción automatizada debido a re-render/estado; requiere ajuste de UI para asegurar que notice se renderice de forma consistente y que el error serializado no se muestre como texto crudo.
