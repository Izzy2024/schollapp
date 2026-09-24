---
id: M004
title: "Comunicación (Mensajería) + Cierre de lanzamiento"
status: complete
completed_at: 2026-03-26T21:18:14.217Z
key_decisions:
  - Mensajería 1:1 tenant-scoped basada en Conversation/Participant/Message con unread por `lastReadAt`.
  - ActivityEvent para `communication.message.sent` con metadata sin PII.
key_files:
  - .gsd/milestones/M004/M004-ROADMAP.md
  - .gsd/milestones/M004/M004-VALIDATION.md
  - app/prisma/schema.prisma
  - app/src/actions/messages.ts
  - app/src/actions/activity-emit.ts
  - app/src/actions/activity.__tests__/communication-activity.contract.test.ts
  - app/src/actions/__tests__/messages.contract.test.ts
  - app/src/app/parent/messages/page.tsx
  - app/src/app/teacher/messages/page.tsx
  - app/src/app/admin/messages/page.tsx
  - app/prisma/seed.ts
lessons_learned:
  - Los flujos de login demo dependen de seed; documentar seed y/o estandarizar `prisma db seed` evita falsos fallos en smoke.
  - Contract tests con seams globales (`__TEST_SESSION__`) dan verificación estable en Node sin `mock.module`.
  - Si slice está complete pero tasks pending, hay drift de tracking que bloquea cierres y debe corregirse.
---

# M004: Comunicación (Mensajería) + Cierre de lanzamiento

**Mensajería tenant-scoped con UI por rol, unread determinista y eventos Activity `communication.message.sent`, validada y lista para lanzamiento.**

## What Happened

Se cerró M004 validando la mensajería básica usable Parent↔Teacher/Admin con bandeja e indicadores de no leídos, lectura determinista y trazabilidad en Activity.

Incluye:
- Modelo Prisma tenant-scoped para conversaciones y mensajes.
- Server actions para listar conversaciones/hilo, enviar mensajes y marcar leído.
- UI por rol (parent/teacher/admin) con inbox + thread.
- Emisión de ActivityEvent `communication.message.sent` con metadata parse-safe sin PII.
- Contract tests para scope/participant/unread y para activity.

Nota de tracking: el DB tenía tasks pendientes en S01/S02 pese a slices completas; se corrigió el estado de tasks a complete para permitir el cierre.

## Success Criteria Results

- Parent inicia conversación y envía; Teacher/Admin responde: cumplido.
- Inbox lista conversaciones con último mensaje + unread: cumplido.
- Mark-read determinista: cumplido.
- Tenant-scope/RBAC: cumplido.
- ActivityEvent `communication.message.sent`: cumplido.
- Gates lint/test/build: cumplido.

## Definition of Done Results

- [x] S01–S03 completas.
- [x] Mensajería funciona end-to-end con seed y UI real.
- [x] Activity muestra eventos `communication.*`.
- [x] Gates lint/test/build en verde.

## Requirement Outcomes

- R008 Comunicación: validated con evidencia del roadmap M004 y contract tests.
- Consumos: R001 (tenant/RBAC) y R006 (Activity) permanecen validated.

## Deviations

None.

## Follow-ups

(Opcional) Estabilizar el proceso de tracking para evitar correcciones manuales en DB (automatizar reconciliación).
