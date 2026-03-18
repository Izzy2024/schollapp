# M002 / S02 — Research

**Date:** 2026-03-18

## Summary

S02 ya tiene una base funcional importante para R004 (Flujo de Inscripción / Reinscripción): existe modelo `Enrollment`, vista administrativa `/admin/enrollment`, validación de cupo por sección y acciones server-side para inscribir/dar de baja. También hay aislamiento por `tenantId` en consultas principales y dependencia explícita de ciclo activo (`AcademicYear.isActive`).

Sin embargo, el flujo actual cubre inscripción inicial y baja, pero **no cubre correctamente reinscripción entre ciclos** ni endurece todos los límites multi-tenant en mutaciones críticas. Además, la trazabilidad (R006) todavía no está integrada en acciones de inscripción: no se registran eventos `ActivityEvent` en `enrollStudent`/`unenrollStudent`, por lo que S02 no entrega aún el “audit trail” esperado por roadmap.

La recomendación es ejecutar S02 como hardening + cierre funcional: (1) reforzar validaciones de pertenencia por tenant en entidades referenciadas (`section`, `enrollment`), (2) modelar explícitamente reinscripción (crear nuevo enrollment para nuevo ciclo, evitar conflicto con uniqueness actual por ciclo), (3) integrar logging estructurado en `ActivityEvent`, y (4) clarificar políticas de cupo para secciones sin capacidad definida.

## Recommendation

Tomar enfoque de **“cerrar huecos de dominio primero, UI después”**:
1. Blindar server actions de inscripción con validaciones de tenant y ciclo.
2. Definir e implementar reglas explícitas de reinscripción (mismo alumno, nuevo `academicYearId`, con controles de estado).
3. Añadir trazabilidad obligatoria en cada cambio de matrícula usando `ActivityEvent`.
4. Ajustar UI para exponer reinscripción y feedback de errores de negocio (cupo, ya inscrito, datos inconsistentes).

Este orden reduce riesgo para S03/S05: asistencia depende de enrollments correctos y S05 depende de eventos confiables.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Autorización por sesión | `auth()` en server actions (`app/src/actions/enrollment.ts`) | Ya es el patrón consistente en el repo para validar usuario autenticado. |
| Persistencia multi-tenant | Prisma con `tenantId` en todos los modelos core (`app/prisma/schema.prisma`) | Evita rediseño; solo falta endurecer filtros de mutaciones puntuales. |
| Feed de trazabilidad | Modelo `ActivityEvent` existente (`app/prisma/schema.prisma`) | Permite auditar sin nueva infraestructura; S05 lo consumirá. |

## Existing Code and Patterns

- `app/src/actions/enrollment.ts` — Núcleo del flujo de matrícula (listar, inscribir, baja, alumnos sin inscripción, capacidad). Es el punto primario para endurecimiento y reglas de negocio.
- `app/src/app/admin/enrollment/page.tsx` — UI actual de inscripción con wizard de 3 pasos, filtros y baja. Buen patrón para extender a reinscripción sin romper UX.
- `app/prisma/schema.prisma` — Define `Enrollment` con `@@unique([tenantId, studentId, academicYearId])` (permite reinscripción entre ciclos) y `ActivityEvent` listo para trazabilidad.

## Constraints

- El sistema depende de un `AcademicYear` activo para casi todo el flujo de inscripción; si no existe, acciones fallan (`No active academic year found`).
- La capacidad está en `Section.capacity Int?`; hoy la UI trata `null` como 0 en algunos outputs (`capacity || 0`) y como infinito en otros (`capacity || '∞'`), generando ambigüedad funcional.
- `unenrollStudent` actualiza por `id` sin filtrar `tenantId`; riesgo de modificar registros fuera del tenant si se filtra mal en capas superiores.
- `enrollStudent` obtiene `section` por `id` sin validar pertenencia al tenant/ciclo activo antes de crear inscripción.

## Common Pitfalls

- **Confiar en `tenantSlug` pasado desde cliente** — En el código ya se sobreescribe con `session.user.tenantSlug`; mantener este patrón y eliminar parámetros opcionales innecesarios para reducir confusión.
- **Contar ocupación sin política clara para `capacity = null`** — Definir una semántica única (“sin límite” o “configuración inválida”) y reflejarla igual en backend y UI.
- **Reinscripción incompleta** — Marcar baja no equivale a reinscribir; se requiere crear enrollment del nuevo ciclo y validar que el ciclo destino sea correcto.
- **Sin bitácora de matrícula** — Si no se generan `ActivityEvent`, S05 no podrá mostrar trazabilidad real de inscripciones/reinscripciones.

## Open Risks

- Riesgo de inconsistencia de datos por mutaciones de inscripción sin filtro fuerte por tenant.
- Reinscripción puede quedarse fuera del alcance real si se asume que “ya existe Enrollment” = “ya está resuelto”, cuando falta flujo explícito entre ciclos.
- Dependencia operativa alta de `AcademicYear.isActive` único; si hay configuración incorrecta (0 o >1 activos), el flujo queda ambiguo.

## Requirement Coverage (Active)

- **R004 (owner directo):** S02 debe cerrar inscripción + reinscripción con validación de cupo. Estado actual: parcialmente cubierto (inscripción y baja sí; reinscripción explícita no).
- **R006 (support):** S02 debe producir trazabilidad de eventos de matrícula que S05 consumirá. Estado actual: no cubierto en acciones de matrícula.
- **R005 (support indirecto):** asistencia en S03 depende de enrollments correctos por ciclo/sección; endurecimiento de S02 reduce fallas posteriores.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js / React frontend for enrollment UI | `frontend-design` | installed / available |
| Prisma + model-driven backend constraints | `context7` | installed / available |
| Next.js/React performance & patterns | `vercel-react-best-practices` | installed / available |
| shadcn/ui (if future UI standardization is desired) | `shadcn` | installed / available |

No core technology in this slice required external skill discovery (`npx skills find`) because relevant skills are already installed and directly aligned.

## Sources

- Enrollment domain model, uniqueness, capacity field, and `ActivityEvent` availability (source: `app/prisma/schema.prisma`)
- Current server-side enrollment behavior and validation gaps (source: `app/src/actions/enrollment.ts`)
- Current admin enrollment UX/wizard, filters, and status handling (source: `app/src/app/admin/enrollment/page.tsx`)
- Slice scope, dependencies, and milestone success criteria (source: preloaded roadmap/context provided in prompt)
