---
estimated_steps: 5
estimated_files: 3
---

# T02: Endurecer server actions de matrícula y registrar ActivityEvent

**Slice:** S02 — Inscripciones y Matrícula
**Milestone:** M002

## Description

Implementar la lógica de dominio de S02 en `enrollment.ts`: validaciones multi-tenant robustas, política consistente de cupo, reinscripción explícita por ciclo y trazabilidad obligatoria en `ActivityEvent`, alineado con R004 y soporte de R006.

## Steps

1. Endurecer lookup/mutaciones para `section`, `enrollment` y entidades relacionadas con filtro obligatorio por `tenantId` de sesión.
2. Unificar semántica de capacidad: `Section.capacity = null` se trata como “sin límite” en todas las validaciones backend.
3. Implementar reinscripción explícita al ciclo destino activo (nuevo enrollment por ciclo) con bloqueo de duplicado en mismo ciclo.
4. Introducir contrato de errores de negocio estable (códigos/tipos) para cupo, duplicidad, falta de ciclo activo y violación de tenant scope.
5. Registrar `ActivityEvent` en alta, baja y reinscripción con metadatos mínimos diagnósticos (`tenantId`, actor, student, section, year).

## Must-Haves

- [ ] Ninguna mutación de matrícula opera fuera del tenant autenticado.
- [ ] Cada operación exitosa de matrícula genera exactamente un `ActivityEvent` consistente.
- [ ] Las fallas de negocio retornan códigos estables consumibles por UI y pruebas.

## Verification

- `cd app && npm test -- enrollment.actions.test.ts`
- Verificar que los casos de tenant, cupo, reinscripción y bitácora pasan con assertions explícitas.

## Observability Impact

- Signals added/changed: eventos `enrollment.created`, `enrollment.unenrolled`, `enrollment.reenrolled`; errores de dominio tipados.
- How a future agent inspects this: pruebas de acciones + consulta de `ActivityEvent` por `tenantId`/tipo para validar trazabilidad.
- Failure state exposed: código de error determinístico y ausencia/presencia de evento por transición.

## Inputs

- `app/src/actions/__tests__/enrollment.actions.test.ts` — contrato fallando definido en T01.
- `app/prisma/schema.prisma` — restricciones/relaciones de `Enrollment`, `Section`, `AcademicYear`, `ActivityEvent`.

## Expected Output

- `app/src/actions/enrollment.ts` — lógica de matrícula endurecida y trazable.
- `app/src/lib/*` (si aplica) — utilidades/tipos de error de negocio reutilizables.
- `app/src/actions/__tests__/enrollment.actions.test.ts` — suite en verde para contrato backend.