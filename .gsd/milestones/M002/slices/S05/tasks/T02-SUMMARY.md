---
id: T02
parent: S05
milestone: M002
provides:
  - Contrato canónico de filtros de bitácora aplicado en UI admin y alineación de entityType en eventos de enrollment.
key_files:
  - app/src/app/admin/activity/page.tsx
  - app/src/actions/enrollment.ts
key_decisions:
  - Reutilizar `getActivityFilterOptions()` como única fuente de opciones de filtro en la UI para evitar drift de casing/naming.
patterns_established:
  - Render resiliente de metadata con marcador visible para fallback `_errorCode` sin romper timeline.
observability_surfaces:
  - Fallback diagnóstico estable `ACTIVITY_METADATA_INVALID_JSON` visible en feed y payload retornado por `getRecentActivities`.
duration: 35m
verification_result: partial
completed_at: 2026-03-18T15:20:00-05:00
blocker_discovered: false
---

# T02: Normalizar contrato de bitácora y filtros canónicos en acciones/UI de activity

**Se normalizaron filtros canónicos en `/admin/activity`, se endureció render de metadata fallback y se alineó `entityType` de enrollment a taxonomía canónica.**

## What Happened

Implementé la parte de contrato canónico y resiliencia UI/data que estaba en alcance directo de T02:

- Reemplacé filtros hardcodeados con valores legacy (`ALL`, `Enrollment`, `Announcement`, `AttendanceSession`) por `getActivityFilterOptions()` desde `app/src/lib/activity-taxonomy.ts`.
- Actualicé estado inicial del filtro a `all` y el encabezado para mostrar etiqueta canónica del filtro activo.
- Mejoré el render de metadata en `app/src/app/admin/activity/page.tsx` para tratar explícitamente el fallback `_fallback` y mostrar un marcador diagnóstico compacto con `_errorCode`.
- Alineé la emisión de eventos en `app/src/actions/enrollment.ts` cambiando `entityType: 'Enrollment'` a `entityType: 'enrollment'` para evitar drift entre productores y consumidor del feed.

`app/src/actions/activity.ts`, `app/src/lib/activity-taxonomy.ts` y `app/src/lib/activity-metadata.ts` ya estaban implementados con contrato canónico y parse-safe; no requirieron cambios adicionales para este paso.

## Verification

Comandos ejecutados:

- `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts` (desde raíz) ❌
  - Falló por script de test raíz no preparado para rutas (`echo "Error: no test specified" ...`).
- `cd app && pnpm test -- src/test/actions/activity-feed.contract.test.ts` ❌
  - Falló porque el script `test` de `app/package.json` no acepta passthrough de archivos.
- `cd app && node --import tsx --test src/test/actions/activity-feed.contract.test.ts` ❌
  - Falló por incompatibilidad del harness existente: `TypeError: mock.module is not a function`.

Resultado de verificación: **parcial**. La validación funcional de T02 queda bloqueada por el harness de pruebas de T01 (ya diagnosticado), no por una nueva regresión observada de runtime en los cambios de este task.

## Diagnostics

Superficies de inspección para futuros agentes:

- Feed admin: `app/src/app/admin/activity/page.tsx`
  - Filtros consumen `getActivityFilterOptions()` (fuente canónica).
  - Fallback metadata renderiza badge con `ACTIVITY_METADATA_INVALID_JSON` cuando aplica.
- Emisiones enrollment: `app/src/actions/enrollment.ts`
  - `ActivityEvent.entityType` ahora persistido como `enrollment` (lowercase canónico).

## Deviations

- No se ejecutó smoke browser de `/admin/activity` porque la validación de T02 estaba centrada en contrato+tests y el pipeline de test quedó bloqueado por incompatibilidad del harness (`mock.module`).

## Known Issues

- Harness de pruebas con `node:test` usa `mock.module`, no disponible en el runtime actual (`Node v20.20.0` + `tsx`), impidiendo correr `activity-feed.contract.test.ts` tal como está escrito.
- Script `app/package.json#test` está fijo a dos suites legacy y no está preparado para ejecutar rutas de prueba arbitrarias del slice.

## Files Created/Modified

- `app/src/app/admin/activity/page.tsx` — filtros canónicos y render resiliente de metadata fallback.
- `app/src/actions/enrollment.ts` — normalización de `entityType` a `enrollment` en emisiones de `ActivityEvent`.
