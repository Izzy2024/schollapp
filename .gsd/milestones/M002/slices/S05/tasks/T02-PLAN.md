---
estimated_steps: 5
estimated_files: 7
---

# T02: Normalizar contrato de bitácora y filtros canónicos en acciones/UI de activity

**Slice:** S05 — Bitácora Global y Dashboard (Overview)
**Milestone:** M002

## Description

Resolver drift de taxonomía/filtros entre productores de eventos y consumidor de feed para que Activity funcione de forma determinista y robusta ante metadata legacy inválida, preservando trazabilidad de R006.

## Steps

1. Crear utilitario canónico de taxonomía (`activity-taxonomy`) con entidades/acciones permitidas y helpers de mapeo de filtros para query/UI.
2. Agregar parser seguro de metadata (`activity-metadata`) con fallback estable y marcador diagnóstico sin romper render.
3. Actualizar `getRecentActivities` y/o acciones relacionadas para usar taxonomía canónica, filtros normalizados y parse-safe.
4. Ajustar UI `/admin/activity` para consumir opciones/filtros canónicos y render de metadata resiliente.
5. Alinear emisiones en `enrollment.ts`, `attendance.ts`, `announcements.ts` donde haya desvíos de naming para que cumplan contrato único.

## Must-Haves

- [ ] El feed acepta filtros deterministas y consistentes con valores persistidos en `ActivityEvent`.
- [ ] Metadata inválida no rompe timeline; se expone fallback diagnóstico estable sin fuga de información sensible.

## Verification

- `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts`
- Smoke opcional: `pnpm test -- app/src/test/actions/activity-feed.contract.test.ts --watch=false` para confirmar estabilidad sin flakiness.

## Observability Impact

- Signals added/changed: Taxonomía de eventos estable y parse fallback explícito para metadata corrupta.
- How a future agent inspects this: Revisando feed UI y ejecutando suite de contrato `activity-feed`.
- Failure state exposed: Drift de acciones/filtros y metadata inválida visible por assertions y marcador diagnóstico.

## Inputs

- `app/src/test/actions/activity-feed.contract.test.ts` — contratos definidos en T01.
- `app/src/actions/enrollment.ts`, `app/src/actions/attendance.ts`, `app/src/actions/announcements.ts` — productores de eventos.

## Expected Output

- `app/src/lib/activity-taxonomy.ts` — contrato centralizado de entity/action/filter.
- `app/src/lib/activity-metadata.ts` — parse seguro reutilizable de metadata.
- `app/src/actions/activity.ts` y `app/src/app/admin/activity/page.tsx` — consumo normalizado y robusto del contrato.
