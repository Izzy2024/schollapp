# Decisions Register

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001/Start | arch | Database | SQLite + Prisma | Quick iteration para el MVP, esquema preparado para Postgres. | Sí (en prod) |
| D002 | M001/Start | feature | Planificador | Uso de modelo Attachment | Profesor podrá vincular PDF/PPT a `CurricularTopic` | No |
| D003 | M002/S03 Planning | verification | Estrategia de cierre S03 | Verificación operativa guiada por 3 suites de pruebas (autorización, persistencia, reporting) creadas en T01 y llevadas a verde en T02/T03, más smoke runtime admin+docente | Asegura que S03 cierre con evidencia reproducible de R005 y soporte R006, no solo checklist documental. | Sí |
| D004 | M002/S03 Planning | observability | Diagnóstico de asistencia | Estandarizar señales de diagnóstico de asistencia con `takenById`, `actorUserId` y errores estables de alcance/estado inválido | S05 depende de trazabilidad confiable; definirlo desde S03 reduce deuda de integración posterior. | Sí |