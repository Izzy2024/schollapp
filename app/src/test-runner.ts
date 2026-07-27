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
