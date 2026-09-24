# M004: Comunicación (Mensajería) + Cierre de lanzamiento

## Intent
Cerrar el gap de **R008 Comunicación** para que el producto sea usable en operación diaria: mensajería básica (padre↔docente/admin), bandeja, lectura/no leído, y una superficie mínima de auditoría. Mantener RBAC + tenant-scope, errores estables, y dejar el repo lanzable.

## Depth
**MVP usable**: 1:1 simple + inbox + unread + Activity events. Sin adjuntos ni push.

## Goals
- Mensajería funcional end-to-end (UI + persistencia) para al menos:
  - Parent → Teacher/Admin
  - Teacher/Admin → Parent
- Bandeja por usuario con hilos/conversaciones y mensajes ordenados.
- Estado de lectura mínimo (unread count o readAt).
- Tenant-scope por sesión; RBAC claro.
- Eventos en Activity (`communication.*`) para trazabilidad (metadata sin PII).
- Repo lanzable (lint/test/build en verde).

## Non-Goals
- Notificaciones push/email.
- Adjuntos en mensajes.
- Búsqueda avanzada.

## Success Criteria
- Parent puede enviar un mensaje a un docente (o a la escuela) y recibe respuesta.
- Teacher/Admin ve inbox, abre conversación y responde.
- Unread badge se actualiza de forma determinista.
- Activity Feed muestra `communication.message.sent` (metadata sin PII).
- `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build` pasan.

## Risks / Unknowns
- Modelado de conversaciones (1:1 vs “a la escuela”) sin romper UX.
- Privacidad/PII en metadata de Activity.
- Si existen placeholders de Mensajes, migrarlos sin dejar rutas a medias.
