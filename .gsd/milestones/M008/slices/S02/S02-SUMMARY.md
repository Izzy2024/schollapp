---
id: S02
parent: M008
milestone: M008
provides:
  - /admin/enrollment demoable: crear/reasignar inscripción y ver tabla del ciclo activo.
requires:
  []
affects:
  - S03 (Teacher) depende de que Admin tenga inscripciones funcionales para poblar clases/alumnos.
key_files:
  - app/src/app/admin/enrollment/page.tsx
  - app/src/app/admin/enrollment/EnrollmentClient.tsx
  - app/src/actions/enrollment-client.ts
  - app/src/actions/enrollment-ui.ts
  - app/src/actions/enrollment-impl.ts
  - app/src/actions/enrollment-errors.ts
  - app/src/actions/enrollment.ts
  - app/scripts/seed.mjs
  - app/scripts/seed-check.mjs
key_decisions:
  - Server action boundary: mantener `use server` solo con exports async; error de dominio serializable (sin clases).
  - Demo-friendly: `ALREADY_ENROLLED_IN_YEAR` -> reenroll/upsert en server action boundary para evitar 500s y simplificar client.
  - ActivityEvent best-effort para no tumbar mutaciones por telemetría/FK.
patterns_established:
  - Boundary de server actions en `actions/*-client.ts` con imports dinámicos hacia `*-impl.ts`.
  - Errores de dominio serializables `{name, code, message}` para surfaces RSC/client.
observability_surfaces:
  - Logs no-fatales en ActivityEvent create (enrollment) cuando hay FK/membership issues.
drill_down_paths:
  - .gsd/milestones/M008/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M008/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T20:59:11.066Z
blocker_discovered: false
---

# S02: Admin: Inscripción mínima utilizable

**Reemplacé el placeholder de Inscripciones por una UI mínima usable y un flujo demo-friendly (inscribir/reasignar) sin 500s bloqueantes.**

## What Happened

Se consolidó un flujo de Inscripciones operable para demo en `/admin/enrollment`.

- UI mínima: formulario “Inscripción rápida” (Alumno + Sección) y tabla de inscripciones del ciclo activo.
- Soporte de datos: server actions para listar alumnos/secciones. Si no hay alumnos elegibles (seed), se listan activos con sufijo “(ya inscrito)” y se muestra un banner “Modo demo”.
- Robustez de errores: se estandarizaron errores de dominio como objetos serializables `{name, code, message}` para compatibilidad con módulos `use server`.
- Demo sin 500s por ALREADY_ENROLLED: el server action boundary trata `ALREADY_ENROLLED_IN_YEAR` como operación tipo upsert y ejecuta `reenrollStudent()` automáticamente.
- Telemetría best-effort: ActivityEvent no bloquea inscripciones si hay fallos de FK/membership.
- Estabilidad de build: se corrigió un re-export que hacía que Next/Turbopack interpretara un módulo `use server` como módulo regular.

Durante el cierre, se re-seedeó la base cuando el tenant desapareció temporalmente y se verificó con `seed-check`.

## Verification

- Browser: `/admin/enrollment` carga sin placeholders y muestra banner “Modo demo”, selects y tabla.
- `cd app && npm test` ✅
- `cd app && npm run build` ✅
- Seed estable: `cd app && node --import tsx scripts/seed.mjs` + `seed-check` ✅

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Aunque el endpoint ya no responde 500 para ALREADY_ENROLLED (se maneja en server action), el UI puede no mostrar siempre un toast de éxito inmediato (depende de refresh/estado). El demo se puede verificar usando Recargar y el listado.

## Known Limitations

La verificación automatizada de que un alumno específico cambie de sección en la tabla no quedó determinista debido a que el selector del formulario puede no apuntar al mismo alumno que se observa en el listado; el flujo se valida por el comportamiento sin 500s y por la persistencia visible tras Recargar en condiciones manuales.

## Follow-ups

Mejorar la UX del feedback post-submit (confirmación visible determinista y/o resaltar fila cambiada). Añadir un indicador del alumno/section antes/después en UI para facilitar verificación automática.

## Files Created/Modified

- `app/src/app/admin/enrollment/page.tsx` — Página Admin Inscripciones renderiza UI mínima operativa.
- `app/src/app/admin/enrollment/EnrollmentClient.tsx` — Client UI: banner modo demo, formulario, tabla, manejo de submit.
- `app/src/actions/enrollment-ui.ts` — Server actions para listar alumnos elegibles/fallback y secciones del año activo.
- `app/src/actions/enrollment-client.ts` — Boundary server action; fallback ALREADY_ENROLLED -> reenroll para evitar 500s.
- `app/src/actions/enrollment-errors.ts` — Errores de dominio serializables para compatibilidad `use server`.
- `app/src/actions/enrollment-impl.ts` — Dominio enrollment: reenroll upsert, ActivityEvent best-effort, checks de tenant/año activo.
- `app/src/actions/enrollment.ts` — Evita re-export de módulo `use server`; re-exporta boundary client-safe.
