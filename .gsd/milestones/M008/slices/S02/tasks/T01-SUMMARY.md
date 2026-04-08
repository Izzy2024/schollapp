---
id: T01
parent: S02
milestone: M008
key_files:
  - app/src/app/admin/enrollment/page.tsx
  - app/src/app/admin/enrollment/EnrollmentClient.tsx
  - app/src/actions/enrollment-ui.ts
  - app/src/actions/enrollment-client.ts
  - app/src/actions/enrollment-impl.ts
key_decisions:
  - Convertir EnrollmentDomainError en error serializable (objeto) para compatibilidad con `use server` y RSC, evitando export de clases.
  - Crear un boundary `enrollment-client.ts` (solo async exports) para que el client component pueda invocar acciones sin importar el módulo de dominio directamente.
duration: 
verification_result: passed
completed_at: 2026-03-27T21:28:41.694Z
blocker_discovered: false
---

# T01: Reemplacé el placeholder de /admin/enrollment por una UI mínima operable con inscripción rápida y listado del ciclo activo.

**Reemplacé el placeholder de /admin/enrollment por una UI mínima operable con inscripción rápida y listado del ciclo activo.**

## What Happened

Se implementó una página de Inscripciones usable para demo en `/admin/enrollment`.

- Se reemplazó el placeholder anterior por un page server component que renderiza un client (`EnrollmentClient`).
- El client muestra:
  - formulario de “Inscripción rápida” (student + section)
  - listado de inscripciones del ciclo activo
- Para evitar el error de Next (“Only async functions are allowed to be exported in a use server file”), se corrigió el boundary:
  - `actions/enrollment-impl.ts` ya no exporta clases/types no-async; los errores de dominio se lanzan como objetos serializables `{name, code, message}`.
  - Se creó `actions/enrollment-client.ts` que exporta solo async functions para consumo desde el client.
- Se añadieron server actions de soporte UI (`actions/enrollment-ui.ts`) para listar alumnos y secciones.

Smoke en browser confirmó que la página ya no muestra 'En construcción' y renderiza los componentes esperados.

## Verification

- Browser: login admin → navegar a `/admin/enrollment` → se ve “Inscripción rápida” y “Inscripciones (ciclo activo)”, no aparece “Página en construcción.”.
- `npm test` pasa.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Browser assert: /admin/enrollment contains 'Inscripción rápida' and no placeholder` | 0 | ✅ pass | 30000ms |
| 2 | `cd app && npm test` | 0 | ✅ pass | 5700ms |

## Deviations

El seed actual ya inscribe a la mayoría/todos los alumnos; por eso el selector de alumnos puede mostrar alumnos ya inscritos y el intento de inscripción puede devolver `ALREADY_ENROLLED_IN_YEAR`. Se mantiene como comportamiento estable y visible; en T02/T03 se ajustará para ofrecer solo elegibles o un flujo alterno (reenroll/mover sección) para demo.

## Known Issues

La UX de error cuando intentas inscribir a un alumno ya inscrito se muestra como mensaje; falta pulir copy para demo (opcional).

## Files Created/Modified

- `app/src/app/admin/enrollment/page.tsx`
- `app/src/app/admin/enrollment/EnrollmentClient.tsx`
- `app/src/actions/enrollment-ui.ts`
- `app/src/actions/enrollment-client.ts`
- `app/src/actions/enrollment-impl.ts`
