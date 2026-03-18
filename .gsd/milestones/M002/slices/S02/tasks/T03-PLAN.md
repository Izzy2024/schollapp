---
estimated_steps: 4
estimated_files: 3
---

# T03: Conectar UI de /admin/enrollment al nuevo contrato de reinscripción y errores

**Slice:** S02 — Inscripciones y Matrícula
**Milestone:** M002

## Description

Actualizar la experiencia de control escolar en `/admin/enrollment` para consumir el contrato endurecido de backend: exponer reinscripción por ciclo, representar cupo de forma consistente y mostrar mensajes accionables de error/éxito.

## Steps

1. Extender el flujo UI para iniciar reinscripción y enviar los datos requeridos al backend (incluyendo ciclo destino según contrato final).
2. Mapear códigos de error de negocio a mensajes claros en pantalla (cupo agotado, ya inscrito en ciclo, tenant inválido, ciclo no activo).
3. Unificar visualización de capacidad (`sin límite` cuando `capacity=null`) en listas/etiquetas de sección.
4. Ajustar pruebas UI y cerrar con verificación en navegador del demo de S02 (inscripción, baja, reinscripción, errores).

## Must-Haves

- [ ] Usuario puede completar reinscripción desde la pantalla real `/admin/enrollment`.
- [ ] Mensajes de error/success reflejan el contrato backend sin ambigüedad.
- [ ] La UI no muestra valores contradictorios para capacidad de sección.

## Verification

- `cd app && npm test -- enrollment-page.test.tsx && npm run build`
- Browser assertions en flujo real (`/admin/enrollment`) para alta/baja/reinscripción y bloqueo por cupo.

## Observability Impact

- Signals added/changed: superficie UI de errores de dominio y estado de operación.
- How a future agent inspects this: pruebas de UI + reproducción manual/browsers assertions del flujo.
- Failure state exposed: mensaje visible asociado a código de error backend y estado post-acción.

## Inputs

- `app/src/actions/enrollment.ts` — contrato final de mutaciones y errores (salida de T02).
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` — casos de UI definidos en T01.

## Expected Output

- `app/src/app/admin/enrollment/page.tsx` — flujo real de reinscripción y feedback de negocio integrado.
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` — pruebas UI en verde.
- Evidencia de verificación (build + browser assertions) para demo operativo de S02.