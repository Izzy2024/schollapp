---
status: done
milestone: M004
slice: S03
started_at: 2026-03-24T16:10:00-05:00
completed_at: 2026-03-24T16:40:00-05:00
verification:
  - pnpm -C app test: pass (includes M004 communication activity contracts)
  - pnpm -C app lint: pass
  - pnpm -C app build: pass
notes:
  - ActivityEvent uses field `occurredAt` (not `createdAt`). Contract tests were updated accordingly.
  - Metadata contract: JSON parse-safe and no PII (no message body, emails, names).
---

# S03 Summary — Observabilidad (Activity communication.*) + hardening + smoke final

## What was added/confirmed
- Activity emission for messaging is already wired in `app/src/actions/messages.ts` via `emitCommunicationMessageSentActivity`.
- Added/registered contract tests to prove `communication.message.sent` emission and metadata shape.

## Tests / Evidence
### New contract suite
- `app/src/actions/activity.__tests__/communication-activity.contract.test.ts`
  - `sendMessage` emits `ActivityEvent` with action `communication.message.sent` and metadata:
    - `{ type, conversationId, messageId, senderUserId, kind }`
    - no PII fields
  - `sendMessageInConversation` emits the same for replies (`kind: reply`).

### Runner wiring
- `app/src/test-runner.ts`
  - Added import for `./actions/activity.__tests__/communication-activity.contract.test`.

### Gates
- `pnpm -C app test` ✅
- `pnpm -C app lint` ✅
- `pnpm -C app build` ✅

## Follow-ups
- There is a console warning about AntD Modal prop deprecation (`destroyOnClose` → `destroyOnHidden`). Not blocking.
