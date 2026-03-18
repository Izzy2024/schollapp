---
id: S04
parent: M002
title: Comunicados Internos
status: pending
risk: low
depends: [S01]
provides:
  - Creación y publicación de comunicados en `/director/announcements`
  - Modelo `Announcement` con targets (school/grade/group) y estado (draft/published)
  - Registro en activity log al publicar
key_screens:
  - /director/announcements (listado + editor)
---

# S04: Comunicados Internos

## Goal
El director puede redactar comunicados y publicarlos a toda la escuela, un grado específico o un grupo. Los comunicados quedan registrados en la bitácora de actividad.

## Tasks (Estimated)
- **T01** — Modelo `Announcement` en Prisma + Server Actions (`createAnnouncement`, `publishAnnouncement`, `getAnnouncements`)
- **T02** — Pantalla `/director/announcements` con listado (draft/published) y editor con selector de target
