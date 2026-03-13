# Decisions Register

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001/Start | arch | Database | SQLite + Prisma | Quick iteration para el MVP, esquema preparado para Postgres. | Sí (en prod) |
| D002 | M001/Start | feature | Planificador | Uso de modelo Attachment | Profesor podrá vincular PDF/PPT a `CurricularTopic` | No |