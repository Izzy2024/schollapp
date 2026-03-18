---
id: S05
parent: M002
title: Bitácora Global y Dashboard Overview
status: pending
risk: medium
depends: [S02, S03, S04]
provides:
  - Activity feed global en `/director/activity` con filtros (fecha, tipo, actor, alumno)
  - Dashboard `/director/overview` con widgets de matrícula, asistencia hoy y pendientes
  - Modelo `ActivityLog` para registrar eventos del sistema
key_screens:
  - /director/overview (dashboard "command center")
  - /director/activity (bitácora global)
---

# S05: Bitácora Global y Dashboard Overview

## Goal
Centralizar toda la actividad del sistema en un activity feed consultable y mostrar métricas clave en un dashboard. Este slice cierra M002 integrando los datos producidos por S02, S03 y S04.

## Tasks (Estimated)
- **T01** — Modelo `ActivityLog` en Prisma + helper `logActivity(tenantId, type, metadata)`
- **T02** — Conectar eventos de S02/S03/S04 al activity log (enrollment, attendance, announcement)
- **T03** — Pantalla `/director/activity` con activity feed (cards con icono, tipo, timestamp, link)
- **T04** — Pantalla `/director/overview` con widgets: matrícula total, % asistencia hoy, pendientes e inscripciones recientes
