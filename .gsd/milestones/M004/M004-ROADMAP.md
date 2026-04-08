# M004: M004: Comunicación (Mensajería) + Cierre de lanzamiento

## Vision
Habilitar mensajería básica usable (padre↔docente/admin) con bandeja, lectura/no leído, trazabilidad en Activity, y gates en verde.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Modelo de mensajería + Server Actions (RBAC/tenant-scope) + contract tests | high | — | ✅ | Existen modelos Prisma (Conversation/Participant/Message/ReadReceipt o equivalente) y acciones server para listar conversaciones, listar mensajes, enviar mensaje y marcar leído; con tests que prueban scope/RBAC/unread. |
| S02 | UI Inbox + Conversación (Parent + Teacher/Admin) + seed demo | high | S01 | ✅ | UI real: inbox por rol, vista de conversación, enviar/recibir, y unread determinista usando seed reproducible. |
| S03 | Observabilidad (Activity communication.*) + hardening + smoke final | medium | S01, S02 | ✅ | Eventos `communication.message.sent` aparecen en Activity; errores estables en UI; `lint/test/build` y runbook de smoke final. |
