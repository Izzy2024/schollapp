---
estimated_steps: 6
estimated_files: 2
---

# T02: Extend activity taxonomy + feed copy/icons for finance

**Slice:** S03 — Observabilidad financiera (ActivityEvent) + superficie de auditoría
**Milestone:** M003

## Description

Make `finance` a first-class entity type in the activity taxonomy so the feed can filter and render finance events coherently (label/icon + human-readable text). This is the user-facing “audit surface” part of S03.

## Steps

1. Update `app/src/lib/activity-taxonomy.ts`:
   - Add `'finance'` to `ACTIVITY_ENTITY_TYPES`.
   - Add filter aliases (e.g. `finance`, `finanzas`).
   - Add `ACTIVITY_TAXONOMY.finance` with label `Finanzas`, icon `paid` (or similar), and actionPrefix `finance.`.
2. Update `app/src/actions/activity.ts` display mapping:
   - Add a `normalizedEntity === 'finance'` branch that sets icon colors/background distinct from other modules.
   - Map common actions to stable copy:
     - `finance.concept.created` → “Creó un concepto de cobro”
     - `finance.concept.updated` → “Actualizó un concepto de cobro”
     - `finance.charge.created` → “Generó un cargo”
     - `finance.payment.recorded` → “Registró un pago”
   - Keep safe fallback text for unexpected finance actions.
3. Ensure `normalizeActivityEntityType` and `normalizeActivityFilter` recognize `finance` and aliases.
4. Run T01 tests and confirm failures (if any) are now only about missing event emission, not taxonomy/filter/render.

## Must-Haves

- [ ] `getActivityFilterOptions()` includes a “Finanzas” option and it routes to `entityType='finance'` / `actionPrefix='finance.'` filtering.
- [ ] `getRecentActivities(..., 'finance', ...)` returns `entityType: 'finance'` (no fallback to announcement).
- [ ] Feed display has deterministic icon/copy for the finance actions used in this milestone.

## Verification

- Run T01 test suite; assertions about filter/entity type pass.
- Optional quick check: call `getActivityFilterOptions()` in a tiny test assertion (or reuse in T01) to ensure finance appears.

## Observability Impact

- Signals added/changed: Human-readable finance activity copy; stable entityType classification.
- How a future agent inspects this: Use the feed filter “Finanzas” (or call `getRecentActivities` with `filterEntityType='finance'`).
- Failure state exposed: Incorrect taxonomy shows up as missing filter option or wrong icons/text.

## Inputs

- `app/src/lib/activity-taxonomy.ts` — current canonical list of types.
- `app/src/actions/activity.ts` — render logic for feed items.

## Expected Output

- `app/src/lib/activity-taxonomy.ts` — finance taxonomy entry + aliases.
- `app/src/actions/activity.ts` — finance-specific display mapping.
