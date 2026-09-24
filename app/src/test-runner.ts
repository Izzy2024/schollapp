// Centralized test runner for this repo.
//
// Why this exists:
// - `tsx --test` discovery is currently unreliable in this repo (it only picks up a subset).
// - For Slice S04/M003 we need a stable signal that always runs in CI.
//
// IMPORTANT: this runner intentionally includes ONLY tests that do NOT rely on
// `node:test` mock.module (fragile / not available in our current runtime).
//
// Conventions:
// - DO NOT use `node:test` mock.module.
// - Prefer test seams: globalThis.__TEST_SESSION__ and globalThis.__TEST_PRISMA__.

// Existing non-mock.module tests
import './lib/auth-guards.test.mjs';
import './test/actions/activity-feed.contract.test';
import './test/actions/overview-kpis.integration.test';
import './test/routes/director-overview-activity.rbac.test';

// M003 official contract suites (Slice S04)
import './actions/finance/__tests__/finance.contract.test';
import './actions/activity.__tests__/finance-activity.contract.test';

// M003/S05 failure visibility contract
import './actions/finance/__tests__/finance.failure-visibility.contract.test';

// M004 messaging contract suites
import './actions/__tests__/messages.contract.test';

// M004 communication -> activity contract suites
import './actions/activity.__tests__/communication-activity.contract.test';

// M010 sibling discounts + payment plans contract suite
import './actions/finance/__tests__/finance.m010.contract.test';
import './actions/finance/__tests__/void-and-multi-payment.actions.test';

// Invitation-based registration + change password contract suite
import './actions/__tests__/invitations.contract.test';

// Report cards (weighted averages + access control) contract suite
import './actions/__tests__/reportCards.contract.test';

// Parent attendance access-control contract suite
import './actions/__tests__/parentAttendance.contract.test';

// Storage adapter selection (local vs Vercel Blob) suite
import './lib/storage/__tests__/storage-adapter-selection.test';

// Email adapter selection (console vs Resend) suite
import './lib/email/__tests__/email-adapter-selection.test';

// Assignment submissions (deadline + file + feedback) contract suite
import './actions/__tests__/submissions.contract.test';

// Password reset by email contract suite
import './actions/__tests__/passwordReset.contract.test';

// Granular RBAC (hasPermission) suite
import './lib/__tests__/rbac.test';

// Admissions pipeline (public application -> exam -> convert) contract suite
import './actions/__tests__/admissions.contract.test';

// Academic year promotion/rollover contract suite
import './actions/__tests__/promotion.contract.test';

// Enrollment certificate PDF contract suite
import './actions/__tests__/certificates.contract.test';

// Conduct/discipline records contract suite
import './actions/__tests__/conduct.contract.test';

// Library catalog + loans contract suite
import './actions/__tests__/library.contract.test';

// School transport routes/stops/assignments contract suite
import './actions/__tests__/transport.contract.test';

// Cafeteria menu/top-up/purchase contract suite
import './actions/__tests__/cafeteria.contract.test';

// Health records and incidents contract suite
import './actions/__tests__/health.contract.test';

// HR/payroll contracts + periods/entries contract suite
import './actions/__tests__/hr.contract.test';

// Asset inventory lifecycle contract suite
import './actions/__tests__/inventory.contract.test';

// Online payments (checkout + webhook) contract suite
import './actions/finance/__tests__/onlinePayments.contract.test';

// External integrations (Google Classroom connect status) contract suite
import './actions/__tests__/integrations.contract.test';

// Rate limiting (login + password reset) contract suite
import './actions/__tests__/rateLimit.contract.test';

// Login rate-limit marker (isTooManyAttemptsError) contract suite
import './actions/__tests__/authRateLimit.contract.test';

// staff/students/guardians authorization contract suite
import './actions/__tests__/staffStudentsGuardians.authz.test';

// Tenant self-activation (key -> tenant + admin with default RBAC) contract suite
import './actions/__tests__/tenantActivation.contract.test';

// Sprint 0 (AUDITORIA-2026-09, tarea 0.1): suites that existed but were never wired in
import './actions/__tests__/attendance.authorization.test';
import './actions/__tests__/attendance.persistence.test';
import './actions/__tests__/attendance.reporting.test';
import './actions/__tests__/enrollment.actions.test';
import './actions/__tests__/announcements.actions.test';
import './actions/__tests__/calendar.contract.test';
import './actions/__tests__/finance.actions.test';
import './actions/activity.__tests__/finance-activity-feed.actions.test';
import './actions/finance/__tests__/payments-and-statement.actions.test';
import './test/actions/communication-activity.contract.test';
import './test/actions/messages-send-in-conversation.contract.test';

// Central authz guard (requireTenant / requirePermission) suite
import './lib/__tests__/authz.test';

// Sprint 1 (AUDITORIA-2026-09): closes the authorization gaps from Sprint 0's audit
import './actions/__tests__/settings.contract.test';
import './actions/finance/__tests__/finance-reads-authz.contract.test';
import './actions/__tests__/reports-admin-activity-authz.contract.test';
import './actions/__tests__/academic-scheduling-authz.contract.test';
import './actions/finance/__tests__/online-payments-webhook.contract.test';
import './actions/finance/__tests__/finance-reads-b-authz.contract.test';
import './actions/__tests__/attendance-classes-gradebook-idor.contract.test';
import './actions/__tests__/login-authz.contract.test';
import './actions/__tests__/attachments-authz.contract.test';
import './actions/__tests__/comms-authz.contract.test';

// Tests are NOT auto-discovered, so a forgotten import means a suite silently never runs.
// Fail the whole run if any *.test.* file under src/ is missing from this runner.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Known exceptions: UI render tests that still use mock.module (they throw on import here).
// Tracked in docs/AUDITORIA-2026-09.md (Sprint 5, tareas 5.3/5.5). Do not add entries without a backlog ID.
const KNOWN_UNWIRED = new Set([
  'app/admin/enrollment/__tests__/enrollment-page.test',
  'app/director/announcements/__tests__/page.integration.test',
]);

const srcDir = path.join(process.cwd(), 'src');
const runnerSource = readFileSync(path.join(srcDir, 'test-runner.ts'), 'utf8');
const imported = new Set([...runnerSource.matchAll(/^import '\.\/(.+)';$/gm)].map((m) => m[1]));
const notImported = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.test\.(ts|tsx|mjs)$/.test(file))
  .map((file) => file.split(path.sep).join('/').replace(/\.tsx?$/, ''))
  .filter((file) => !imported.has(file) && !KNOWN_UNWIRED.has(file));
if (notImported.length > 0) {
  throw new Error(`Test files not imported in src/test-runner.ts (they would never run):\n${notImported.join('\n')}`);
}
