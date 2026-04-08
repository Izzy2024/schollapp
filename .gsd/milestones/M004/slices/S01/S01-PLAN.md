# S01: Modelo de mensajería + Server Actions (RBAC/tenant-scope) + contract tests

**Goal:** Definir el modelo mínimo de mensajería en Prisma y exponer acciones server tenant-scoped con RBAC, respaldadas por contract tests (sin `mock.module`).
**Demo:** After this: Existen modelos Prisma (Conversation/Participant/Message/ReadReceipt o equivalente) y acciones server para listar conversaciones, listar mensajes, enviar mensaje y marcar leído; con tests que prueban scope/RBAC/unread.

## Tasks
- [x] **T01: Diseñar esquema Prisma + migración** — 
- [x] **T02: Implementar server actions (list/send/markRead)** — 
- [x] **T03: Contract tests (scope/RBAC/unread) usando seams** — 
