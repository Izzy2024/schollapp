# S05 — Research

**Date:** 2026-03-18

## Summary

S05 **supports and operationalizes R006 (Bitácora/Activity Log y trazabilidad)** and also helps close **R005 (asistencia/reporting)** and **R004 (inscripciones)** through overview KPIs sourced from their existing models/actions. The codebase already has a production-ready `ActivityEvent` Prisma model and event emission from S02/S03/S04 surfaces (`enrollment`, `attendance`, `announcements`), so the highest-leverage path is to **standardize and reuse**, not introduce a parallel `ActivityLog` model.

Current implementation already includes `/admin/activity` and `/actions/activity.ts`, plus dashboard stats functions in `/actions/admin.ts` and `/actions/directorStats.ts`. The main S05 risk is **contract drift**: the slice context still says `ActivityLog` + `/director/*`, while real code uses `ActivityEvent` + mostly `/admin/*` with only partial director mirrors. S05 should be framed as contract alignment and consolidation: unify event taxonomy, improve filters, and expose director-facing routes backed by existing actions.

## Recommendation

Implement S05 as an **integration/refinement slice** over existing primitives:
1. Keep `ActivityEvent` as canonical log storage (do not add `ActivityLog`).
2. Add/complete director surfaces (`/director/activity`, `/director/overview`) by reusing `getRecentActivities`, `getAdminDashboardStats`, and/or `getEnrollmentStats` with role-safe wrappers.
3. Normalize filter values and event naming so feed filtering is deterministic.
4. Add focused tests for S05 contracts (feed filters + overview KPI integrity + role access).

This minimizes schema churn and preserves S02–S04 observability lineage already in place.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Global activity persistence | `ActivityEvent` in `app/prisma/schema.prisma` | Already indexed by tenant/time and wired from enrollment/attendance/announcements. |
| Humanized activity rendering | `getRecentActivities` in `app/src/actions/activity.ts` | Existing icon/text mapping and pagination; only needs contract hardening. |
| Dashboard attendance today KPI | `getAdminDashboardStats` in `app/src/actions/admin.ts` | Already computes same-day present/total from `AttendanceRecord` + session date range. |
| Enrollment KPI by active year | `getEnrollmentStats` in `app/src/actions/directorStats.ts` | Already aggregates totals/grade/section occupancy tied to active academic year. |

## Existing Code and Patterns

- `app/prisma/schema.prisma` — canonical `ActivityEvent` model (`tenantId`, optional `actorUserId`, `entityType`, `entityId`, `action`, `occurredAt`, JSON-string `metadata`) with key indexes:
  - `@@index([tenantId, occurredAt(sort: Desc)])`
  - `@@index([tenantId, entityType, entityId])`
- `app/src/actions/enrollment.ts` — emits namespaced events (`enrollment.created|unenrolled|reenrolled`) with domain references.
- `app/src/actions/attendance.ts` — emits attendance activity during session save flows; metadata includes operational diagnostics from S03 lineage.
- `app/src/actions/announcements.ts` — emits namespaced announcement events (`announcement.created|published|deleted`) aligned with D006.
- `app/src/actions/activity.ts` — paginated feed query + presentational mapping. Important: current filter IDs (`Enrollment`, `Announcement`, `AttendanceSession`) may not match persisted `entityType` casing/value exactly.
- `app/src/app/admin/activity/page.tsx` — complete UI timeline surface (filters, incremental pagination, metadata rendering) that can be mirrored/reused for director.
- `app/src/actions/admin.ts` — overview-style counters (students, teachers, sections, pending requests, attendance today, recent activities).
- `app/src/actions/directorStats.ts` — enrollment-centric aggregates by active year and section occupancy.
- `.gsd/milestones/M002/slices/S05/context.md` — intended slice scope, but currently mismatched with implementation naming/routes.

## Requirements Coverage (Active)

- **R006 (primary):** fully in-scope — centralized bitácora and traceability.
- **R005 (supporting):** overview attendance-today KPI depends on reliable attendance records.
- **R004 (supporting):** enrollment totals/recent enrollment activity for overview widgets.
- **R001 (cross-cutting):** all queries must remain tenant-scoped and role-authorized.

## Constraints

- Multi-tenant isolation is mandatory: every feed/stat query must anchor on resolved `tenantId` from authenticated context.
- Existing metadata is stored as stringified JSON (`metadata String?`), so consumers must guard parse failures/malformed payloads.
- S02/S03/S04 slice summaries are placeholders; task artifacts/tests are the authoritative behavior source.
- Director routes in slice context may require wrappers/mirrors since current mature UI is admin-first.

## Common Pitfalls

- **Entity filter mismatch** — UI filter constants (`Enrollment`, etc.) won’t match DB values if casing or namespace differs.  
  Avoid by introducing a canonical enum map shared between writer actions and feed query filters.

- **Action-name drift across modules** — some modules use namespaced (`announcement.created`), others may use legacy labels.  
  Avoid by codifying accepted action taxonomy and asserting it in tests.

- **Assuming valid JSON metadata** — `JSON.parse` can throw on legacy rows.  
  Avoid by safe parse with fallback (`null` + diagnostic marker).

- **Route-level RBAC gaps** — cloning admin pages for director without guard checks can leak/deny unexpectedly.  
  Avoid by explicit role checks in server actions/page wrappers and integration tests for director paths.

## Open Risks

- **Spec/code divergence risk:** S05 context says new `ActivityLog` model; code already standardized on `ActivityEvent`.
- **Feed observability consistency risk:** not all event producers may include equally useful metadata keys for dashboard drill-down.
- **Time-window correctness risk:** attendance-today depends on local date boundaries; timezone handling should be explicitly validated.
- **Performance risk at scale:** pagination exists, but no date-indexed actor/action filter index; adding richer filters could require extra indexing.

## Skill Discovery (Suggested)

Installed/available skills from system:
- `context7` (installed) — directly relevant for framework/library API refresh.
- `vercel-react-best-practices` (installed) — relevant for Next.js/React dashboard patterns.
- `frontend-design` (installed) — relevant if S05 includes significant UI rework.

External skill search (`npx skills find`) for direct stack dependencies:

| Technology | Skill | Status |
|------------|-------|--------|
| Prisma | `sickn33/antigravity-awesome-skills@prisma-expert` | discovered (not installed) |
| Prisma | `prisma/skills@prisma-client-api` | discovered (not installed) |
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | discovered (not installed) |
| Next.js | `sickn33/antigravity-awesome-skills@nextjs-best-practices` | discovered (not installed) |
| Ant Design | `ant-design/antd-skill@ant-design` | discovered (not installed) |

Suggested install commands (user decision):
- `npx skills add sickn33/antigravity-awesome-skills@prisma-expert`
- `npx skills add wshobson/agents@nextjs-app-router-patterns`
- `npx skills add ant-design/antd-skill@ant-design`

## Sources

- Existing research template structure (source: `~/.gsd/agent/extensions/gsd/templates/research.md`)
- S05 declared scope and tasks (source: `.gsd/milestones/M002/slices/S05/context.md`)
- Canonical activity storage schema (source: `app/prisma/schema.prisma`)
- Feed query + rendering normalization logic (source: `app/src/actions/activity.ts`)
- Admin overview KPI aggregation (source: `app/src/actions/admin.ts`)
- Enrollment overview aggregation (source: `app/src/actions/directorStats.ts`)
- Existing bitácora UI surface (source: `app/src/app/admin/activity/page.tsx`)
- Skill discovery outputs (source: `npx skills find "Prisma"`, `npx skills find "Next.js"`, `npx skills find "Ant Design"`)
