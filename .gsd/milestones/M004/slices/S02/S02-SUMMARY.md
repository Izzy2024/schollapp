---
status: done
milestone: M004
slice: S02
started_at: 2026-03-23T16:20:00-05:00
last_attempt_at: 2026-03-24T09:45:00-05:00
verification:
  gates:
    lint: pass
    test: pass
    build: pass
  runtime_smoke:
    dev_server: pnpm -C app dev (http://localhost:3000)
    evidence:
      - Teacher replied in thread; message persisted and appeared in thread + inbox.
      - Parent opened thread and saw reply message.
---

# S02 Summary — UI Inbox + Conversación + Nueva conversación

## What shipped
- UI routes:
  - `/parent/messages` (inbox + thread + compose + new conversation)
  - `/teacher/messages` (inbox + thread + compose + new conversation)
  - `/admin/messages` (inbox + thread + compose)
- Server actions:
  - list inbox, list thread, mark read
  - new conversation (sendMessage) + recipients list
  - deterministic thread send (sendMessageInConversation)
- Seed demo thread is created (Padre Demo ↔ Docente Uno).

## Verification
- Gates:
  - `pnpm -C app lint` ✅
  - `pnpm -C app test` ✅
  - `pnpm -C app build` ✅

## Runtime smoke (manual) — latest state (PASS)

### Pre-flight
- `pnpm -C app run db:reset` ✅
- `pnpm -C app run db:seed` ✅

### Parent → Teacher (new conversation)
- Login `padre@demo.com` ✅
- `/parent/messages` ✅
- Send new message to Docente Uno ✅ (conversation appears)

### Teacher reply (thread send)
- Login `docente1@demo.com` ✅
- `/teacher/messages` shows conversation from Padre Demo ✅
- Open thread ✅
- Send reply via thread compose (uses `sendMessageInConversation`) ✅
- Result: message appears in thread and inbox lastMessage updates ✅

### Parent sees teacher reply
- Login `padre@demo.com` ✅
- `/parent/messages` shows conversation with lastMessage = "Respuesta docente (smoke)" ✅
- Open thread ✅
- Reply message is present in thread ✅

## Notes
- Reply send now surfaces failure explicitly and forces a re-fetch with messageId verification.
- We added stable selectors (`data-testid`) for the reply composer to enable deterministic automation.

## Follow-ups
- Consider replacing `antd` static `message.*` with `<App>`-scoped message API to remove console warnings.
