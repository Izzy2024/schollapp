---
id: T02
parent: S03
milestone: M003
provides:
  - Finance becomes a first-class ActivityEvent entity type with filter aliases + deterministic feed copy/icons
key_files:
  - app/src/lib/activity-taxonomy.ts
  - app/src/actions/activity.ts
key_decisions:
  - Use taxonomy-level filtering (entityType OR actionPrefix startsWith) so finance events remain discoverable even if older rows miss entityType
patterns_established:
  - Per-entity feed display mapping keyed off normalizeActivityEntityType + action string match
observability_surfaces:
  - getActivityFilterOptions(): now includes Finanzas
  - getRecentActivities(...,'finance',...): returns only finance entityType activities (once events exist)
duration: 45m
verification_result: passed_with_expected_failures
completed_at: 2026-03-20
blocker_discovered: false
---

# T02: Extend activity taxonomy + feed copy/icons for finance

**Added `finance` to the activity taxonomy, including filter aliases, label/icon, and feed rendering copy for core finance actions.**

## What Happened

- Extended `ACTIVITY_ENTITY_TYPES` to include `finance`.
- Added filter aliases so user-facing filters like `finanzas` resolve to `finance`.
- Added `ACTIVITY_TAXONOMY.finance` with label “Finanzas”, icon `paid`, and actionPrefix `finance.`.
- Updated `getRecentActivities()` feed item display mapping to render finance events with a distinct icon style and stable Spanish copy for:
  - `finance.concept.created`
  - `finance.concept.updated`
  - `finance.charge.created`
  - `finance.payment.recorded`
  - plus a safe fallback for unexpected `finance.*` actions.

## Verification

- Ran contract suite from T01:
  - `pnpm -C app test src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`
- Result: test failures are now due to missing finance ActivityEvent emission (expected in T03), not taxonomy/filter/render.

## Diagnostics

- Filter options surface:
  - `getActivityFilterOptions()` now includes “Finanzas” with `id: 'finance'`.
- Feed filter surface:
  - `getRecentActivities(tenantSlug, 'finance', ...)` now normalizes the filter correctly and will filter by `entityType='finance'` OR `actionPrefix='finance.'`.

## Deviations

- None.

## Known Issues

- Finance server actions still do not emit `ActivityEvent` rows (`finance.charge.created`, `finance.payment.recorded`), so the contract tests remain red until T03 is implemented.

## Files Created/Modified

- `app/src/lib/activity-taxonomy.ts` — added `finance` entity type, aliases, and taxonomy entry.
- `app/src/actions/activity.ts` — added finance-specific feed display mapping (icon + stable copy).
