# S04 («Comunicados Internos») — Research

**Date:** 2026-03-18

## Summary

El slice S04 ya tiene implementación funcional en código para crear, listar, publicar y eliminar comunicados (`/admin/announcements` + `app/src/actions/announcements.ts`) con persistencia en `Announcement`/`AnnouncementTarget`, aislamiento por `tenantId` y registro parcial en `ActivityEvent` al crear. Esto cubre buena parte del objetivo operativo del roadmap (“publicar comunicado por escuela/grado/grupo”).

Sin embargo, hay desalineaciones importantes entre contexto/alcance esperado y estado actual: (1) la ruta implementada es de Admin (`/admin/announcements`) mientras el contexto de slice habla de Director (`/director/announcements`), (2) no hay validación de RBAC por acción (cualquier usuario autenticado podría invocar server actions si llega a ellas), (3) no se valida la integridad del target (`grade`/`section`) contra el tenant ni consistencia de `targetType` vs `targetId`, y (4) la trazabilidad en `ActivityEvent` es incompleta/inconsistente (solo create registra evento, publish/delete no).

Para cerrar M002 con bajo riesgo, la recomendación es **endurecer backend primero** (autorización, validaciones de target, trazabilidad homogénea) y luego ajustar superficie de UI/ruta según decisión de producto (Admin vs Director o ambas). El modelo de datos actual soporta el alcance, por lo que no se requiere rediseño grande; sí requiere reglas explícitas para evitar deuda que impacte S05 (bitácora global).

## Recommendation

Implementar S04 sobre el código existente, evitando rehacer UI, con este orden:

1. **Hardening de Server Actions (`announcements.ts`)**
   - Verificar rol permitido (`admin` y/o `director`) al inicio de cada acción.
   - Validar payload por regla de negocio:
     - `all` => `targetId` debe ser nulo.
     - `grade` => `targetId` obligatorio y debe existir `GradeLevel` del mismo tenant.
     - `section` => `targetId` obligatorio y debe existir `Section` del mismo tenant.
   - Registrar `ActivityEvent` para `announcement.created`, `announcement.published`, `announcement.deleted` con metadata mínima diagnóstica (`targetType`, `targetId`, `publishedNow`, `actorUserId`).

2. **Alineación de routing/ownership funcional**
   - Decidir formalmente si S04 vive en `/admin/announcements`, `/director/announcements` o en ambas rutas con mismo backend.
   - Evitar bifurcar lógica: reutilizar misma página/componente o wrapper de ruta.

3. **Preparar integración con S05**
   - Estandarizar nombres de `action` en bitácora para que `app/src/actions/activity.ts` no dependa de heurísticas ambiguas.
   - Mantener consistencia de eventos para feed unificado (dependencia explícita S04 → S05 en roadmap).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Resolver tenant actual en server actions | Patrón `auth()` + `session.user.tenantSlug` + `prisma.tenant.findUnique` en `announcements.ts` y acciones existentes | Ya está adoptado en el codebase y evita parámetros inseguros desde cliente. |
| Revalidación de UI después de mutaciones | `revalidatePath('/admin/announcements')` | Patrón estándar ya operativo en la página actual. |
| Trazabilidad base para feed | `ActivityEvent` + `app/src/actions/activity.ts` | S05 depende de esta tabla; extenderla es más seguro que crear almacenamiento paralelo. |

## Existing Code and Patterns

- `app/src/actions/announcements.ts` — CRUD base de comunicados con aislamiento por tenant y revalidación de ruta.
- `app/src/app/admin/announcements/page.tsx` — UI completa (listado, filtros draft/publicado, modal de creación, preview, publicar/eliminar).
- `app/prisma/schema.prisma` — modelos `Announcement`, `AnnouncementTarget`, `ActivityEvent` ya presentes.
- `app/src/actions/attendance.ts` — patrón de hardening útil para S04: funciones explícitas de autorización/scope (`assertRoleCanWrite...`, `assertTenantScope`) y errores estables.
- `app/src/actions/activity.ts` — consume eventos de comunicados por convenciones de `entityType`/`action`; evidencia de dependencia con S05.
- `.gsd/milestones/M002/slices/S04/context.md` — define expectativa de alcance (director + targets school/grade/group + publicación).

## Constraints

- Debe respetar herencia multi-tenant/RBAC de M001 (R001), sin exponer mutaciones cross-tenant.
- S04 alimenta S05; por tanto, el shape de `ActivityEvent` para comunicados no puede quedar ambiguo o incompleto.
- El modelo actual usa `targetType` como `String` (sin enum), así que validación debe imponerse en capa de acción para evitar basura de datos.
- `AnnouncementTarget` permite múltiples targets por anuncio, pero UI/acciones actuales operan uno; si no se define regla explícita, puede generar ambigüedad futura.

## Common Pitfalls

- **Sin autorización por rol en server actions** — Aunque la UI esté en Admin, acciones invocables sin guard explícito son riesgo de escalamiento. Añadir chequeo de rol al backend.
- **Target inválido o de otro tenant** — Guardar `targetId` sin verificar existencia/scope rompe segmentación y feed. Validar contra `GradeLevel`/`Section` por `tenantId`.
- **Eventos incompletos para bitácora** — Solo registrar `created` deja ciego publish/delete en S05. Emitir eventos en todas las mutaciones relevantes.
- **Desalineación de ruta (admin vs director)** — Puede cerrar técnicamente pero fallar aceptación funcional del slice. Confirmar owner de pantalla antes de cierre.

## Open Risks

- Riesgo de rechazo de aceptación si no se alinea con expectativa explícita de “Director publica comunicados”.
- Riesgo de deuda para S05 si `action` queda como `created` genérico en lugar de namespace estable (`announcement.created`, etc.).
- Riesgo de inconsistencia funcional por usar catálogo de secciones de asistencia para targets de comunicados (dependencia implícita no documentada).

## Requirements Coverage (Active)

- **R008 (Comunicación — Anuncios y Mensajería):** S04 lo adelanta claramente (aunque aparezca planificado para M003, aquí se implementa parte “anuncios”).
- **R006 (Bitácora y Trazabilidad):** S04 lo soporta al emitir `ActivityEvent` de comunicados; actualmente parcial.
- **R001 (RBAC y Multi-tenant):** S04 depende de esta base y debe reforzarla en acciones.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js / React frontend for announcements UI | `frontend-design` | installed (available) |
| Up-to-date framework/library docs validation | `context7` | installed (available) |
| Systematic debugging for auth/scope regressions | `debug-like-expert` | installed (available) |
| Prisma + NextAuth specific external skill | N/A | none found from installed list; use existing installed skills above |

Promising external skill search (not installed, suggested only):
- `npx skills find "Prisma"`
- `npx skills find "NextAuth"`
- `npx skills find "Next.js server actions"`

## Sources

- S04 expected scope and tasks (source: `.gsd/milestones/M002/slices/S04/context.md`)
- Milestone dependency map S04 → S05 and success criterion for comunicados (source: `.gsd/milestones/M002/M002-ROADMAP.md`)
- Active requirements ownership/support context (source: `.gsd/REQUIREMENTS.md`)
- Existing implementation of announcements actions (source: `app/src/actions/announcements.ts`)
- Existing admin announcements UI (source: `app/src/app/admin/announcements/page.tsx`)
- Data model for `Announcement`, `AnnouncementTarget`, `ActivityEvent` (source: `app/prisma/schema.prisma`)
- Existing activity feed interpretation for announcement events (source: `app/src/actions/activity.ts`)
- Hardened authorization/scope pattern reference (source: `app/src/actions/attendance.ts`)
