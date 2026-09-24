# Auditoría APPSSCHOLL (2026-09-24) y plan de ejecución por sprints

> Al aprobarse, este documento se guarda en `app/docs/AUDITORIA-2026-09.md`. Es el backlog que ejecutarán los agentes.

## Estado de ejecución
| Sprint | Estado | Rama | Notas |
|---|---|---|---|
| 0 | ✅ Hecho (2026-09-24) | `audit/sprint-0` | 0.1 (tests huérfanos) y 0.2 (guard `lib/authz.ts` + `lib/rbac-defaults.ts`). `npm test`: 148 tests, 140 pass, 0 fail, 8 skip |
| 1 | ✅ Hecho (2026-09-24) | 4 ramas `audit/1{a,b,c,d}-*`, mergeadas a `main` | Las 12 tareas (1.1–1.12) en 4 carriles paralelos vía Herdr (agy/kilo/cmd/opencode). `npm test`: 192 tests, 189 pass, 0 fail, 3 skip (2 diferidos + 1 pre-existente). tsc/lint/build en verde |
| 2–6 | Pendiente | — | — |

**Tests en skip que cada tarea debe reactivar** — todos los del Sprint 0 ya se reactivaron en el Sprint 1, salvo los dos diferidos a propósito:
| Skip | Tarea que lo reactiva |
|---|---|
| `AUDIT LOG-C1` (enrollment) | 2.2 |
| `AUDIT LOG-H1` (attendance.persistence) | 4.1 |

**Hallazgos nuevos del Sprint 1:**
- **Colisión entre carriles (resuelta al integrar):** el carril A (agy, tarea 1.6) movió `assertFinanceWriteAccess`/`ensureActorUserExists` de `finance/_shared.ts` a `finance/_shared-internal.ts`; el carril C (cmd, tarea 1.7) seguía importándolas del archivo viejo. Conflicto de merge en 5 archivos (`concepts.ts`, `delinquency.ts`, `discounts.ts`, `invoices.ts`, `payment-plans.ts`), resuelto unificando los imports al nuevo layout. **Lección para sprints futuros:** cuando una tarea mueve símbolos exportados de un archivo compartido, avisar explícitamente a las demás tareas que importan de ese archivo, aunque estén en otro carril.
- **Regresiones de fixtures (resueltas al integrar), no detectables por carril:** cada carril solo corre sus propios tests nuevos + los que la guía nombra explícitamente; 3 tests de OTROS módulos (Sprint 0 y anteriores) usaban sesiones o datos que las nuevas verificaciones de permiso ya no aceptan (`role: 'ADMIN'` singular en vez de `roles: ['admin']`; falta de permiso `students:manage` sembrado; un `enrollmentId` de mentira que la nueva validación de tarea 1.5 ya no acepta). Corregidos en el commit de integración `451c7d9`. **Lección:** antes de aceptar un carril, correr `npm test` completo (no solo los tests que la guía nombra), porque cambios de autorización pueden romper fixtures de módulos que ningún carril tocó.
- **Guard usado en producción a partir de aquí:** toda mutación/lectura sensible pasa por `requireTenant()`/`requirePermission(code)` de `@/lib/authz`. Persisten sin permiso 3 helpers en `'use server'` files pendientes de mover si se encuentran en sprints futuros (patrón ya establecido: `_shared-internal.ts`, `activity-emit.ts`, `delinquency-internal.ts`, `onlinePayments-webhook.ts`, `scheduleConflicts-internal.ts`).

**Hallazgos nuevos del Sprint 0:**
- **PROC-1b:** eran 13 tests huérfanos, no 11. Dos son de UI (`app/admin/enrollment/__tests__/enrollment-page.test.tsx` y `app/director/announcements/__tests__/page.integration.test.tsx`) y siguen usando `mock.module`. Quedan en la lista explícita `KNOWN_UNWIRED` de `src/test-runner.ts`; hay que reescribirlos en las tareas 5.3 y 5.5.
- **PROC-6 (resuelto):** `src/lib/prisma.ts` resolvía `__TEST_PRISMA__` una sola vez al importar y 5 suites no limpiaban los seams. Eso generaba fallos que dependían del orden de ejecución. Se corrigió con un seam por acceso y limpieza en `after()`.
- **PROC-7 (nuevo, tarea 6.3):** hay 14 copias locales de `safeRevalidate` y 20 archivos con `revalidatePath` directo, que falla fuera de un request. Hay que unificarlos en un helper `lib/revalidate.ts`.
- **Guard disponible:** a partir del Sprint 1, toda action usa `requireTenant()` / `requirePermission(code)` de `@/lib/authz`, y los tests usan `seedPermission()` de `@/test/factories/rbac`.

## Contexto
- **Qué se hizo:** una auditoría completa de solo lectura. Se revisaron 72 archivos de server actions (~265 funciones), 106 páginas, 7 rutas API, auth, RBAC, schema (70 modelos), tests y CI. Los hallazgos críticos se re-verificaron a mano en el código.
- **Por qué ahora:** la app está en **pre-lanzamiento**, sin datos reales. Cambiar el schema y la semántica es barato hoy y muy caro después.
- **Quién ejecuta:** agentes de IA orquestados. Por eso cada tarea declara qué archivos toca, de qué depende, su criterio de aceptación y cómo se verifica.
- **Decisiones de producto tomadas:**
  - **Asistencia por clase:** cada docente pasa lista en su clase.
  - **Mercado solo Panamá:** USD, es-PA, cédula, año escolar marzo–diciembre, factura DGI.
  - **Escala de notas configurable por escuela:** se guarda 0–100 y se muestra en 1.0–5.0, 0–100 o 0–10, con nota mínima para aprobar configurable.

## Resumen ejecutivo
1. **La autorización es el agujero principal.** `auth.config.ts:72-73` deja pasar todas las server actions sin control, y sus IDs están en el JS público. En la práctica, cada action es una API abierta para cualquier usuario con sesión. Unas 60 actions no verifican rol ni permiso. Además, 3 aceptan el tenant desde el cliente y permiten leer o escribir en **otra escuela**.
2. **Tres cadenas centrales se rompen en uso normal:**
   - Tras la promoción de año, los alumnos **desaparecen** de gradebook, asistencia y portal.
   - La **segunda escuela no puede facturar**.
   - La asistencia de distintos docentes **se sobreescribe**.
3. **Las finanzas no cuadran:**
   - La morosidad ignora los abonos.
   - Los descuentos y los planes de pago pueden cobrar de más.
   - El webhook de Stripe puede registrar un pago dos veces o des-anular un cargo.
   - Admin y director muestran una "cartera vencida" distinta.
4. **Lo académico es incoherente:** 4 fórmulas de promedio, 3 de % de asistencia, periodos que no se pueden gestionar, un catálogo que se regenera al cargar páginas y zona horaria ignorada.
5. **La UX falla en lo básico:**
   - Errores en inglés o como códigos crudos.
   - Inutilizable en móvil.
   - 6 páginas siempre vacías.
   - Nombres de usuario hardcodeados.
   - Ajustes fijados a `school-demo`.
6. **Nada de esto lo detectan los tests:** 11 archivos de test (32 tests) nunca se ejecutan, y unos 25 módulos no tienen test.

## Causas raíz (arreglarlas previene familias enteras de bugs)
| # | Causa raíz | Familia que genera |
|---|---|---|
| R1 | No hay un guard central; cada action decide si autoriza | Todas las fallas SEG-* |
| R2 | La identidad de alumno y tutor se resuelve por **email** (mutable, no único, sensible a mayúsculas) y no por FK a `User` | Suplantación, hermanos rotos, "sin perfil vinculado" |
| R3 | Se guarda estado derivado (overdue, estado de factura, saldo) en vez de calcularlo | Morosidad, facturas y dashboards incoherentes |
| R4 | Cada página y cada action reimplementa sus fórmulas (promedio, % asistencia, moneda, "hoy") | Números distintos por rol |
| R5 | Escrituras con efectos laterales en rutas de lectura (`ensureDefaultPrimaryCatalog`, `teacher.ts` crea un año) | Datos que reaparecen, periodos basura |
| R6 | Lecturas y escrituras fuera de transacción, sin restricciones únicas | Doble pago, sobrepago, saldos negativos, P2002 sin manejar |
| R7 | El runner de tests es manual y el typecheck y el lint excluyen casi todo | Bugs que llegan a main sin señal |

---

## Hallazgos

Severidades: CRIT = crítico, HIGH = alto, MED = medio, LOW = bajo. Rutas bajo `app/src/`. Todo lo CRIT se re-verificó a mano.

### Seguridad (SEG)
| ID | Sev | Dónde | Problema |
|---|---|---|---|
| SEG-C1 | CRIT | `actions/settings.ts:169` | `getTenantSettings(slug del cliente)` devuelve el PAC API key, RUC y DV de **cualquier escuela** |
| SEG-C2 | CRIT | `actions/settings.ts:78` | `importStudentsCsv(slug del cliente)`, sin chequeo de rol, crea o sobreescribe alumnos (nombre, cédula, email) en cualquier escuela |
| SEG-C3 | CRIT | `actions/finance/onlinePayments.ts:70` | `recordOnlinePaymentFromWebhook` se exporta en `'use server'` sin auth y confía en la metadata: puede marcar cargos como pagados |
| SEG-H1/H2 | HIGH | `settings.ts:30,195` | `updateTenantProfile` y `updateTenantSettings` no chequean rol: un alumno puede renombrar la escuela o cambiar sus datos fiscales |
| SEG-H3 | HIGH | `actions/activity.ts:23` | Feed de auditoría de otra escuela vía el slug del cliente |
| SEG-H4 | HIGH | `academic.ts`, `subjects.ts`, `adminClasses.ts`, `classRequests.ts`, `scheduleRequests.ts`, `enrollment-impl.ts`, `enrollment-client.ts`, `finance/enrollment-charges.ts` | Mutaciones de admin sin rol. Un padre puede cambiar el año activo o inscribir y generar cargos; un docente puede asignarse cualquier clase (`assignTeacher`) o aprobar su propia solicitud |
| SEG-H5 | HIGH | `finance/charges\|payments\|statements\|invoices\|delinquency\|payment-plans\|discounts\|concepts`, `pdf-invoice.tsx`, `api/invoices/[id]/pdf`, `reports.ts:8` (`requireTenantOwner` no chequea rol), `admin.ts` | Lectura financiera y del padrón por cualquier rol. Los folios de factura son secuenciales y enumerables |
| SEG-H6 | HIGH | `attendance.ts:94,269,386`, `classes.ts:8,101,172`, `attachments.ts:49,71` | IDOR: asistencia de cualquier alumno; listas de clase con promedios; listar o borrar archivos ajenos |
| SEG-H7 | HIGH | `attachments.ts:17`, `submissions.ts:109`, `lib/storage/local-adapter.ts:14`, `blob-adapter.ts:13` | Uploads sin validar tipo ni tamaño; `.html`/`.svg` servidos en `public/` → XSS almacenado; Blob `access:'public'` |
| SEG-H8 | HIGH | `health`, `conduct`, `library`, `cafeteria`, `transport`, `reportCards`, `studentQueries`, `parent` + `invitations.ts:177` | La identidad por email permite suplantar (con C2, o al registrarse con cualquier email) |
| SEG-M1 | MED | `scheduleRequests.ts:65`, `finance/delinquency.ts:383,397`, `finance/_shared.ts:41,55`, `activity-emit.ts:15` | Helpers sin auth exportados desde archivos `'use server'` |
| SEG-M2 | MED | `subjects.ts:85,103`, `adminClasses.ts:117,147`, `health.ts:92`, `enrollment-charges.ts:54,78,280`, `academic.ts:149` | `update`/`delete`/`upsert` por id sin `tenantId`; FKs del cliente sin validar |
| SEG-M3 | MED | `attendance.ts:314,184,337`, `gradebook.ts:174` | Un docente escribe asistencia de cualquier sección; los `studentId` no se validan contra la inscripción; score sin límites |
| SEG-M4 | MED | `authActions.ts:46-67` | Enumeración de emails (mensaje `SEED_REQUIRED` distinto) antes del rate limit |
| SEG-M5 | MED | `auth.ts:132-175` | El JWT no se revoca: desactivar un usuario o resetear su contraseña no corta sus sesiones (30 días) |
| SEG-M6 | MED | `lib/payment/stripe-adapter.ts:40`, `onlinePayments.ts:82` | No se chequea `payment_status`; la idempotencia es find-then-insert sin unique |
| SEG-M7 | MED | `lib/rate-limit.ts:72-112` | No es atómico, falla abierto, permite bloquear cuentas ajenas y confía en `X-Forwarded-For` |
| SEG-L1..L12 | LOW | varios | Ver detalle abajo |

Detalle de SEG-L1..L12:
- Demo login sin guard de `NODE_ENV`, con credenciales precargadas en `LoginForm`.
- Fallback de `AUTH_SECRET` fuera de producción.
- Token de reset guardado en claro.
- Invitaciones de 48 bits sin rate limit.
- Seams de test y usuarios falsos `'test'` en código productivo (`charges.ts:54`, `payments.ts:79,196`).
- Revisor hardcodeado a `admin@demo.com` (`classRequests.ts:150`).
- HTML de emails sin escapar e inyección de fórmulas en CSV.
- Alias de rol que causa loop de redirect (`auth-guards.mjs`).
- `teacher.ts:164` escribe datos en una lectura.
- Borradores de anuncios visibles para todos los roles.
- `listRecipients` expone todos los emails.

### Lógica de negocio y cadenas (LOG)
| ID | Sev | Dónde | Problema → efecto |
|---|---|---|---|
| LOG-C1 | CRIT | `promotion.ts:143,149`, `enrollment-impl.ts:267,272` vs 25 lecturas `status:'enrolled'` | Tras promover o reinscribir, los alumnos desaparecen de gradebook, asistencia, portal y stats. La inscripción vieja nunca se cierra y `findFirst` sin año elige cualquiera (`reportCards.tsx:125`, `submissions.ts:101`, `conduct.ts:39`, `notifications.ts:176`, `student.ts:128`) |
| LOG-C2 | CRIT | `schema.prisma:1299` `folio @unique` global vs numeración por escuela `invoices.ts:51` | La 2.ª escuela no puede facturar (P2002). Dos facturas concurrentes también chocan |
| LOG-C3 | CRIT | `onlinePayments.ts:70-108`, `payments.ts:19` | El webhook puede registrar un pago doble, marca pagado sin `payment_status`, y `settleChargeStatus` des-anula cargos `void` |
| LOG-H1 | HIGH | `attendance.ts:167`, schema `@@unique([tenantId, sectionId, date])` | Asistencia por grupo con UI por clase → los docentes se pisan |
| LOG-H2 | HIGH | `enrollment-impl.ts:192`, `enrollment-charges.ts:95,169,99,137` | Inscribir y cobrar no es atómico (solo `console.warn`); un P2002 revierte todos los cargos; cobra meses previos a la inscripción; `annual` se ofrece en la UI pero no existe |
| LOG-H3 | HIGH | `charges.ts:19`, `promotion.ts:109` | Retirados y graduados siguen facturándose |
| LOG-H4 | HIGH | `payment-plans.ts:33,51,120,125` | Divide el total y no el saldo (cobra de más); cuotas canceladas pagables; `void` no cancela el plan; `setMonth` salta meses |
| LOG-H5 | HIGH | `discounts.ts:25,172-211` | El descuento se aplica 2 veces, ignora la vigencia, no re-liquida el cargo y el % no tiene tope |
| LOG-H6 | HIGH | `delinquency.ts:57,76,147,186`, `payments.ts:19`, `invoices.ts:401` | La morosidad ignora abonos; overdue solo se marca con un botón manual; un abono resetea overdue; las facturas nunca pasan a `paid` |
| LOG-H7 | HIGH | `reports.ts:208-224,220,273`, `admin.ts:84` | La "cartera vencida" de admin y director usa fórmulas distintas; el director cuenta cargos anulados; `paymentCount` tiene tope de 10 |
| LOG-H8 | HIGH | `guardians.ts:30`, `admissions.ts:318`, `parent.ts:45`, `discounts.ts:91` | Hermanos rotos: cada vínculo crea un Guardian nuevo, el padre ve un solo hijo y el descuento por hermanos siempre es 0 |
| LOG-H9 | HIGH | `students.ts:160`, `guardians.ts:36` vs login en minúsculas | Match de email sensible a mayúsculas → "Sin perfil vinculado" |
| LOG-H10 | HIGH | `teacher.ts:164-190`, `reportCards.tsx:61` | No hay CRUD de periodos; se crea "2024-2025" al cargar una página; los periodos no se filtran por año |
| LOG-H11 | HIGH | `adminClasses.ts:22,187`, `subjects.ts:18`, `classRequests.ts:18`, `defaultPrimaryCatalog.ts:62` | El catálogo se regenera en cada carga (~136 upserts): revierte renombres, recrea lo borrado y duplica secciones y clases tras la promoción |
| LOG-H12 | HIGH | `gradebook.ts:97`, `classes.ts:148`, `student.ts:50`, `reportCards.tsx:147` | 4 promedios distintos (ej. 8/10 y 90/100 da 49 en gradebook y 85 en boleta); tipos `Examen`/`Tarea` vs `exam`/`homework` |
| LOG-H13 | HIGH | `ChargesWithInvoice.tsx:66` → `api/invoices/from-charge` (exige `finance:write`) | Los padres nunca pueden descargar su factura (500) |
| LOG-H14 | HIGH | `panama-invoicing.ts:72,107-150`, `panama-fep.ts:181,211` | ITBMS sumado encima; CUFE local sin llamar al PAC y factura marcada `sent` |
| LOG-H15 | HIGH | `classRequests.ts:185,194`, `scheduleRequests.ts:65-177,487-558,492,508` | Aprobar sobreescribe al docente; copia horarios sin chequear choques; no detecta choque de grupo; un "cambio" edita el slot equivocado; doble aprobación duplica; slots de años viejos bloquean |
| LOG-M* | MED | varios | Ver detalle abajo |
| LOG-L* | LOW | varios | Ver detalle abajo |

Detalle de LOG-M*:
- Pago manual con chequeo de saldo fuera de la transacción → sobrepago.
- Cafetería con saldo negativo en concurrencia; biblioteca con copias en -1; inventario sin máquina de estados.
- Conversión de aspirante duplicable.
- 3 fórmulas de % de asistencia.
- Zona horaria: `Tenant.timezone` nunca se usa; la asistencia tomada después de las 19:00 se guarda al día siguiente; entregas del mismo día marcadas tarde.
- P2002 sin manejar: evaluación duplicada, código de descuento, `STD-count+1`, nómina, slug.
- Activity feed: etiqueta mal los eventos de horario y no registra notas, promoción ni webhook; faltan `revalidatePath` en páginas de padre y alumno.
- Promoción no transaccional, sin criterio de aprobación, y pisa ubicaciones manuales.
- Activación: el catálogo se crea fuera de la transacción; un tenant nuevo queda sin periodos, conceptos ni pesos.
- El dashboard del padre muestra "Al corriente" cuando la consulta falla.
- Las vistas previas de horario y la aprobación no coinciden.

Detalle de LOG-L*:
- Nómina con neto negativo.
- La parada de transporte no se valida contra la ruta.
- Montos de concepto sin validar.
- Los tipos de evaluación del seed no casan con los pesos.
- `generateInvoice` devuelve una factura cancelada.

### UI y flujos (UI)
| ID | Sev | Dónde | Problema |
|---|---|---|---|
| UI-H1 | HIGH | `app/admin/settings/page.tsx:5,10` | `'school-demo'` hardcodeado: ajustes rotos para toda escuela real, y el import CSV escribe en la demo |
| UI-H2 | HIGH | 5 páginas + 1 mock | Ver detalle abajo |
| UI-H3 | HIGH | 143× `e.message`, 28× `message.error(res.error)` | En producción, Next oculta los mensajes lanzados → el usuario ve inglés genérico o códigos crudos (`ROUTE_FULL`, `INSUFFICIENT_BALANCE`…). Hay 6 mapas de errores locales y ninguno compartido |
| UI-H4 | HIGH | `components/DashboardLayout.tsx:58,139` | Sidebar fijo `w-72`: inutilizable en móvil; perfil y logout solo aparecen al pasar el mouse |
| UI-H5 | HIGH | ~60 páginas | Nombres de usuario hardcodeados ("Administrador", "Prof. García", "Dr. A. Richardson"); el layout no lee la sesión |
| UI-H6 | HIGH | `LoginForm.tsx:18-24,84-90`, `authActions.ts:63` | Panel demo y credenciales precargadas en todos los logins; texto de desarrollador ("Ejecuta npx prisma db seed") |
| UI-H7 | HIGH | 4 formatos (`es-PY`, `es-MX`, `es-PA`, `toFixed`) y 5× MXN | Moneda y formato inconsistentes |
| UI-H8 | HIGH | `SettingsClient.tsx:476` | "✅ Lista para emitir" en la factura electrónica, cuando el envío al PAC es un TODO |
| UI-M* | MED | varios | Ver detalle abajo |
| UI-L* | LOW | varios | Ver detalle abajo |

Detalle de UI-H2, páginas que nunca muestran datos:
- `admin/assignments`, `admin/exams`, `admin/class-prep` y `director/resources` leen campos que `getSectionSubjects` no devuelve.
- `parent/documents` no tiene fuente de datos.
- `student/settings` importa `@/auth` en el cliente y termina mostrando datos mock.

Detalle de UI-M*:
- Errores tragados y spinners infinitos (`.catch(console.error)`, 6 páginas de padre sin try).
- Botones y enlaces muertos:
  - "Ver Perfil" de staff, "Filtrar" del alumno y las flechas de semana del horario.
  - `upcomingCharges: []`.
  - Badge de admin que nunca aparece.
  - Notificación del director sin inbox.
  - `?classId` en lugar de `?class`.
- El director ve el sidebar de admin.
- Rendimiento:
  - N+1 en la campana de notificaciones en cada navegación.
  - No hay `layout.tsx` por rol → se re-monta el layout y se re-consulta el perfil.
  - Listas sin límite.
  - El conteo de staff del director tiene tope de 20.
- `getStudents` lanza error sin año activo.
- Rastros de México: CURP, `es-MX` y el ejemplo "1° Secundaria".

Detalle de UI-L*:
- 14 páginas huérfanas y duplicados.
- Textos en inglés o crudos.
- `error.tsx` genérico; no hay `loading.tsx` ni `not-found.tsx`.
- Accesibilidad:
  - ~45 botones de solo ícono sin `aria-label`.
  - Modales sin `role="dialog"`.
  - 119 labels sin `htmlFor`.
  - Formularios en los que Enter no envía.
- 325 `any`.

### Proceso, calidad y datos (PROC)
| ID | Sev | Problema |
|---|---|---|
| PROC-1 | HIGH | 11 archivos de test (32 tests) fuera de `test-runner.ts`: `attendance.authorization`, `attendance.persistence`, `attendance.reporting`, `enrollment.actions`, `finance.actions`, `payments-and-statement`, `announcements`, `calendar`, `finance-activity-feed`, 2 de mensajes |
| PROC-2 | HIGH | Cascadas peligrosas: borrar un Student o un FinanceConcept borra cargos y pagos; Subject, AcademicYear y Section arrastran el historial académico; `User` → pagos que registró |
| PROC-3 | MED | ~25 módulos sin test: scheduleRequests, classRequests, gradebook, delinquency, invoices, planning, settings, reports, academic, student/studentQueries… |
| PROC-4 | MED | El typecheck de CI excluye los tests (~100 errores tsc) y el lint cubre solo 15 archivos |
| PROC-5 | LOW | Ver detalle abajo |

Detalle de PROC-5:
- `middleware.ts` deprecado en Next 16 (→ `proxy.ts`).
- `.eslintcache` trackeado en git.
- Dos lockfiles (npm y pnpm) con drift.
- `CLAUDE.md` desactualizado (dice SQLite y `db push`).
- `GAP-ANALYSIS.md` se contradice (líneas 39/71 vs 94).

---

## Recomendaciones
1. **Congelar features nuevas hasta cerrar los Sprints 0–2.** Hoy el sistema no es seguro ni coherente para una escuela real.
2. **Un solo guard** (`requirePermission` / `requireOwnership`) al inicio de **toda** action, más un test de "matriz de autorización" por módulo, en el que el alumno y el padre reciben `UNAUTHORIZED_ROLE`.
3. **Identidad por FK** (`Student.userId`, `Guardian.userId`) y no por email.
4. **Derivar en vez de guardar:** saldo, overdue y estado de factura se calculan en una sola función.
5. **Una fuente de verdad por fórmula:** `lib/grading.ts`, `lib/attendance.ts`, `lib/money.ts`, `lib/dates.ts`.
6. **Invariantes en la base de datos:** uniques y `Restrict` en historial, más transacciones con updates condicionales. No confiar en chequeos en JS.
7. **Test rojo antes de cada fix:** un contract test contra Postgres real, registrado en el runner.
8. **Antes de salir a producción:** Postgres gestionado con backups, Blob privado, headers de seguridad y CSP, monitoreo de errores, y confirmar con un contador si la matrícula y la mensualidad llevan ITBMS.

---

## Protocolo para los agentes (aplica a toda tarea)
- **Delegación:** con la skill `orchestration` (Orca). Una tarea equivale a un worker, en su propia rama `audit/<ID>` desde `main`.
- **Primero, el test rojo:** un contract test en `src/actions/__tests__/` o `src/lib/__tests__/`, **importado en `src/test-runner.ts`**, que falle antes del fix. Para sembrar permisos se usa el helper de la tarea 0.2.
- **Propiedad de archivos:** cada worker toca solo los archivos de su tarea. Si necesita otro, escala al coordinador; no lo edita.
- **Tareas ⚠schema:** nunca van en paralelo entre sí. Cada una crea su migración con `npx prisma migrate dev --name <id>` y la commitea.
- **Definición de hecho:** todo esto en verde y el CI en verde:
  - `npm test` sin fallos.
  - `npx tsc --noEmit -p tsconfig.ci.json`.
  - `npm run lint`.
  - `npm run build`.
- **Antes de aceptar un `worker_done`:** el coordinador revisa el `git diff`, y además un screenshot si la tarea toca UI.
- **Reglas del código:** reutilizar `getTenantIdFromSession` (`actions/finance/_shared.ts`), `hasPermission` (`lib/rbac.ts`) y `STABLE_ERROR` (`lib/errors.ts`). No crear un segundo mecanismo.

---

## Sprints
Leyenda: ∥ = paralelizable con el resto del sprint; → = depende de; ⚠ = toca `schema.prisma`.

### Sprint 0: Red de seguridad (secuencial, va primero)
| ID | Tarea | Archivos | Cierra | Aceptación |
|---|---|---|---|---|
| 0.1 | Conectar los 11 tests huérfanos. Arreglar los desactualizados; si un test revela un bug, dejarlo en `skip('AUDIT <ID>')` y anotarlo aquí. Agregar al runner un chequeo que falle si existe un `*.test.ts` sin importar | `src/test-runner.ts`, los 11 tests | PROC-1 | `npm test` en verde; crear un test sin importar hace fallar el runner |
| 0.2 | Guard central `src/lib/authz.ts`: `requireTenant()` y `requirePermission(code)` sobre `getTenantIdFromSession` + `hasPermission`. Mover el mapa de roles a `src/lib/rbac-defaults.ts` y usarlo desde `prisma/seed.ts` y `tenantActivation.ts`. Nuevos códigos: `academic:manage`, `settings:manage`. Extraer el helper de test `seedPermission()` (hoy en `admissions.contract.test.ts`) | `lib/authz.ts`, `lib/rbac-defaults.ts`, `prisma/seed.ts`, `actions/tenantActivation.ts`, `src/test/helpers/` | R1 | Tests unitarios del guard; el seed y la activación usan el mismo mapa |

### Sprint 1: Cerrar los agujeros de seguridad (→ Sprint 0; todo ∥, sin archivos compartidos)
| ID | Tarea | Archivos | Cierra |
|---|---|---|---|
| 1.1 | Tenant siempre desde la sesión; `settings:manage` en escrituras y en `getTenantSettings`; `getTenantProfile` devuelve solo nombre y logo; quitar `'school-demo'` | `actions/settings.ts`, `app/admin/settings/*` | SEG-C1, C2, H1, H2, L8; UI-H1 |
| 1.2 ⚠ | Sacar `recordOnlinePaymentFromWebhook` de `'use server'` (a `lib/payment/`); exigir `payment_status==='paid'`; rechazar cargos `void`/pagados; `@@unique([tenantId, reference])` en FinancePayment con manejo de P2002 | `onlinePayments.ts`, `lib/payment/*`, `api/payments/webhook`, schema | SEG-C3, M6; LOG-C3 (a, b) |
| 1.3 | `academic:manage` en las mutaciones; update y delete con `tenantId`; validar que las FK pertenezcan al tenant | `academic.ts`, `subjects.ts`, `adminClasses.ts` | SEG-H4, M2 (parte) |
| 1.4 | Aprobar y rechazar exigen `schedule:manage`; `staffId` desde la sesión; verificar la propiedad de la clase; `findScheduleConflicts` fuera de `'use server'`; revisor = usuario de la sesión | `classRequests.ts`, `scheduleRequests.ts` | SEG-H4, M1, L6 |
| 1.5 | `students:manage` en inscripción y en generación de cargos por inscripción; scoping por tenant | `enrollment-impl.ts`, `enrollment-client.ts`, `enrollment-ui.ts`, `finance/enrollment-charges.ts` | SEG-H4, H5, M2 |
| 1.6 | Lecturas de finanzas A (`finance:write`); `getForStudent` con permiso o vínculo de tutor; eliminar los usuarios falsos `'test'`; helpers fuera de `'use server'` | `finance/charges.ts`, `payments.ts`, `statements.ts`, `_shared.ts` | SEG-H5, M1, L5 |
| 1.7 | Lecturas de finanzas B; `markReminder*` fuera de `'use server'`; `scheduleReminder` con tenant; `updateOverdueStatuses` con permiso | `finance/invoices.ts`, `pdf-invoice.tsx`, `api/invoices/[id]/pdf`, `delinquency.ts`, `financeDelinquency.ts`, `payment-plans.ts`, `discounts.ts`, `concepts.ts` | SEG-H5, M1, M2 |
| 1.8 | `reports.ts` y `admin.ts` con `requirePermission`; `activity.ts` solo con el slug de la sesión y con rol; `activity-emit.ts` fuera de `'use server'` | `reports.ts`, `admin.ts`, `activity.ts`, `activity-emit.ts`, `directorStats.ts` | SEG-H3, H5, M1 |
| 1.9 | IDOR de alumno y clase. Reglas: el propio alumno, su tutor, el docente de la clase, o quien tenga el permiso. Validar `studentId` contra la inscripción; score en rango | `attendance.ts`, `classes.ts`, `gradebook.ts` | SEG-H6, M3 |
| 1.10 | Uploads: whitelist de extensión y MIME, límite de tamaño, servir por una ruta autenticada con `Content-Disposition: attachment` (nada en `public/`), Blob privado; `getAttachments`/`deleteAttachment` con dueño o permiso | `attachments.ts`, `submissions.ts` (solo la subida), `lib/storage/*`, nueva `api/files/[id]` | SEG-H7, H6 |
| 1.11 | Login: mensaje de error uniforme y rate limit antes del lookup; demo login solo si `NODE_ENV!=='production'` (panel demo solo en dev); el callback `jwt` re-verifica `isActive` y `passwordChangedAt` (⚠ si hace falta el campo); rate limit atómico | `authActions.ts`, `auth.ts`, `login/LoginForm.tsx`, `lib/rate-limit.ts` | SEG-M4, M5, M7, L1, L2; UI-H6 |
| 1.12 | Varios de bajo riesgo: borradores de anuncios, alcance de `listRecipients`, escapar HTML en emails, escapar fórmulas en CSV, rate limit de invitaciones, alias de rol y loop en `auth-guards` | `announcements.ts`, `messages.ts`, `invitations.ts`, `passwordReset.ts`, `reports.ts` (solo CSV, → 1.8), `lib/auth-guards.mjs` | SEG-L4, L9, L10, L12 |

**Aceptación del sprint:** un test de matriz por módulo en el que una sesión de alumno o de padre recibe `UNAUTHORIZED_ROLE` en cada mutación y lectura sensible, y en el que no existe acceso cruzado entre tenants con slug o id ajeno.

### Sprint 2: Cadenas críticas de datos (→ Sprint 1)
| ID | Tarea | Archivos | Cierra |
|---|---|---|---|
| 2.1 ⚠ | Identidad por FK. **2.1a:** `Student.userId` y `Guardian.userId` (únicos, opcionales), asignados al registrarse por invitación, al aprovisionar y al activar; emails en minúsculas al escribir; registrarse con invitación exige el email del invitado. **2.1b:** `lib/identity.ts` (`getCurrentStudent`, `getGuardianStudents`) aplicado a las actions de alumno. **2.1c:** lo mismo para las actions de padre; un tutor con varios hijos (reutilizar el Guardian existente); el descuento por hermanos funciona. Las tres partes van en secuencia | `schema`, `invitations.ts`, `accountProvisioning.ts`, `guardians.ts`, `admissions.ts`, `health`, `conduct`, `library`, `cafeteria`, `transport`, `reportCards`, `studentQueries`, `student.ts`, `parent.ts`, `statements.getForParent`, `onlinePayments`, `submissions` | SEG-H8; LOG-H8, H9 |
| 2.2 | Estado de inscripción: siempre se escribe `'enrolled'`; cerrar la inscripción del año anterior (`'completed'`); helper `getActiveEnrollment()` filtrado por año activo; quitar la transferencia silenciosa en `enrollment-client` | `promotion.ts`, `enrollment-impl.ts`, `enrollment-client.ts`, `enrollment-ui.ts`, `lib/enrollment.ts` + los 5 `findFirst` (después de 2.1) | LOG-C1, M12 |
| 2.3 | Catálogo: crear solo al crear el tenant (dentro de la transacción de activación, y en el seed), sin sobreescribir; sacarlo de las rutas de lectura; defaults de Panamá (materias MEDUCA, año marzo–diciembre, 3 trimestres) | `lib/defaultPrimaryCatalog.ts`, `adminClasses.ts`, `subjects.ts`, `classRequests.ts`, `tenantActivation.ts` | LOG-H11, M-activación; UI-M (Panamá) |
| 2.4 | Periodos: CRUD de Term en `admin/academic`; quitar el efecto lateral de `teacher.ts`; filtrar periodos por año activo; periodo por defecto = el vigente según la fecha | `academic.ts`, `teacher.ts`, `app/admin/academic/*`, `gradebook/page.tsx`, `planning/page.tsx`, `reportCards.tsx` (solo `getTermsForTenant`) | LOG-H10; UI-H10 |
| 2.5 ⚠ | Folio: quitar el `@unique` global; generar el folio dentro de una transacción, con reintento ante P2002 | `schema`, `finance/invoices.ts` | LOG-C2 |
| 2.6 | Inscripción → cargos en la misma transacción, o error visible; cobrar desde el mes de inscripción; implementar `annual` o quitarlo de la UI; idempotente por (alumno, concepto, periodo) | `enrollment-impl.ts`, `finance/enrollment-charges.ts`, `ConceptsTab.tsx` (→ 2.2) | LOG-H2 |
| 2.7 | Estados del alumno: el retiro anula los cargos futuros pendientes; la graduación pone `Student.status='graduated'`; `generateForPeriod` solo cobra a inscritos activos | `finance/charges.ts`, `promotion.ts` (→ 2.2), `students.ts` | LOG-H3 |
| 2.8 ⚠ | Borrado seguro: `onDelete: Restrict` en finanzas y en el historial académico; baja lógica de alumnos; guards explícitos en `delete*` | `schema`, `academic.ts`, `subjects.ts` | PROC-2 |

**Aceptación del sprint:**
- Activar una escuela, inscribir alumnos, promover, y verificar que los alumnos aparecen en gradebook, asistencia y portal del año nuevo.
- Una segunda escuela emite factura.
- Un tutor con dos hijos ve a ambos.

### Sprint 3: Finanzas correctas (→ Sprint 2; ∥ salvo lo marcado)
| ID | Tarea | Archivos | Cierra |
|---|---|---|---|
| 3.1 | Pagos atómicos: chequeo de saldo con un update condicional dentro de la transacción; `settleChargeStatus` preserva `void`; tope en `recordManual` | `finance/payments.ts` | LOG-C3 (c), M (sobrepago) |
| 3.2 | Planes: dividir el saldo restante; cuotas canceladas no pagables; transacción; `void` cancela el plan; fechas seguras a fin de mes | `finance/payment-plans.ts` | LOG-H4 |
| 3.3 ⚠ | Descuentos: una aplicación por cargo (unique); respetar la vigencia; re-liquidar el cargo; % ≤ 100; `maxUses` atómico | `finance/discounts.ts`, `schema` | LOG-H5 |
| 3.4 | Morosidad derivada: `lib/finance/outstanding.ts` (monto − pagado − descuentos; overdue por `dueDate` al leer; excluye `void`), usada por los dashboards de admin y director y por la morosidad; facturas sincronizadas al pagar; `paymentCount` real | `delinquency.ts`, `reports.ts`, `admin.ts`, `invoices.ts` (solo sync), `DelinquencyTab.tsx` | LOG-H6, H7; UI-H7 (cartera) |
| 3.5 | Factura para padres: action o ruta que verifica el vínculo de tutor y genera la factura si falta | `api/invoices/from-charge`, `ChargesWithInvoice.tsx` | LOG-H13 |
| 3.6 | Facturación Panamá honesta: feature flag apagado hasta integrar el PAC; no marcar `sent` sin PAC; tratamiento de ITBMS configurable (**validar con contador**); la UI deja de decir "Lista para emitir" | `panama-invoicing.ts`, `lib/panama-fep.ts`, `SettingsClient.tsx` (→ 1.1) | LOG-H14; UI-H8 |
| 3.7 | `lib/money.ts` `formatMoney(cents)` (es-PA, USD) en todas las vistas; quitar `es-PY`/`es-MX`/MXN/`toFixed`; conceptos con default USD y montos enteros > 0 | vistas de finanzas, `parent/*`, `hr`, `cafeteria`, `payroll`, `concepts.ts` | UI-H7; LOG-L |
| 3.8 | Módulos satélite con updates condicionales: cafetería (saldo ≥ monto, ítems inactivos), biblioteca (copias), inventario (máquina de estados + transacción), RRHH (neto ≥ 0, staff del tenant, periodo pagado), transporte (parada de la ruta) | `cafeteria.ts`, `library.ts`, `inventory.ts`, `hr.ts`, `transport.ts` | LOG-M, L |
| 3.9 | Stripe en la UI: ocultar "Pagar en línea" sin gateway; `revalidatePath` en las páginas de padre tras un pago o webhook | `ChargesWithInvoice.tsx` (→ 3.5), `onlinePayments.ts` | UI-M; LOG-M (revalidate) |

**Aceptación del sprint:**
- Escenario: cargo de $100, abono de $40, descuento del 10 %, plan en 2 cuotas. El saldo, el estado, la factura y los dashboards de admin y director coinciden al centavo.
- Dos pagos concurrentes no sobrepagan.

### Sprint 4: Académico coherente (→ Sprint 2)
| ID | Tarea | Archivos | Cierra |
|---|---|---|---|
| 4.1 ⚠ | **Asistencia por clase:** `AttendanceSession` con `sectionSubjectId`, único por (tenant, clase, fecha); solo la toma el docente de la clase; la vista de admin agrega por sección; `lib/attendance.ts` define una fórmula de % única, usada por todas las vistas | `schema`, `attendance.ts`, `classes.ts`, `AttendanceDrawer.tsx`, `app/admin/attendance`, `parent.ts`, `reports.ts`, `students.ts` | LOG-H1, M (%); UI-M1 |
| 4.2 ⚠ | **Notas:** `Tenant.gradeScale` y `passingGrade`; `lib/grading.ts` (normaliza por `maxScore`, pondera por tipo canónico, excluye faltantes, convierte a la escala); tipos de evaluación canónicos; `maxScore > 0`; aplicarlo en gradebook, clase, dashboard y analytics del alumno, reportes y boleta; configuración en `admin/settings/grade-weights` | `schema`, `lib/grading.ts`, `gradebook.ts`, `GradebookClient.tsx`, `classes.ts`, `student.ts`, `studentQueries.ts`, `reportCards.tsx`, `NewEvaluationModal.tsx`, páginas del alumno | LOG-H12, M (evaluaciones); UI-M2 |
| 4.3 | Zona horaria: default `America/Panama`; `lib/dates.ts` (`todayInTenant`, `parseDateOnly`); corregir la fecha de asistencia, las entregas marcadas tarde, el vencimiento en biblioteca, notificaciones, morosidad y el año del folio | `lib/dates.ts` y sus llamadas | LOG-M (tz); UI-M8 |
| 4.4 | Horarios: choque de grupo; el "cambio" edita el slot pedido; aprobar dentro de una transacción con guard de estado; filtrar por año; la vista previa y la aprobación usan la misma función; aprobar una solicitud de clase no pisa al docente sin confirmación | `scheduleRequests.ts`, `classRequests.ts` | LOG-H15, M (vista previa) |
| 4.5 | Promoción: transaccional; lista de "repite" sugerida con `passingGrade` y editable; no pisa ubicaciones manuales; opción de copiar clases y docentes | `promotion.ts`, `app/admin/academic/promotion` | LOG-M (promoción) |
| 4.6 | Admisiones y activación: conversión idempotente en transacción y solo para aceptados; manejo amigable de P2002 (evaluación duplicada, código de descuento, código de alumno por secuencia, nómina, slug) | `admissions.ts`, `gradebook.ts` (→ 4.2), `students.ts`, `hr.ts` (→ 3.8), `tenantActivation.ts` | LOG-M (P2002, conversión) |

**Aceptación del sprint:**
- Dos docentes pasan lista al mismo grupo el mismo día y ambas quedan guardadas.
- El mismo alumno muestra el mismo promedio y el mismo % de asistencia en las vistas de docente, admin, alumno y padre, y en la boleta.
- La asistencia tomada a las 20:00 hora de Panamá queda con la fecha de ese día.

### Sprint 5: UX y flujos (→ Sprint 1; en su mayoría ∥ con los Sprints 3 y 4)
| ID | Tarea | Archivos | Cierra |
|---|---|---|---|
| 5.1 | Errores en español: `lib/errorMessages.ts` (`STABLE_ERROR` → es) une los 6 mapas locales; las fallas esperadas se devuelven como `{error: code}` en vez de lanzarse; helper `showError()`; reemplazar los 28 códigos crudos y los 143 `e.message` | `lib/errorMessages.ts`, `lib/errors.ts`, páginas afectadas | UI-H3 |
| 5.2 | `app/<rol>/layout.tsx` con `DashboardLayout` que lee la sesión (nombre y rol reales); sidebar responsive (drawer en pantallas menores a `lg`); perfil y logout siempre accesibles | `app/*/layout.tsx`, `DashboardLayout.tsx`, luego quitar el layout de cada página | UI-H4, H5, M (re-mount) |
| 5.3 | Páginas rotas: actions dedicadas para `admin/assignments`, `exams`, `class-prep` y `director/resources`; `student/settings` lee la sesión desde el servidor; `parent/documents` con fuente real, o se quita; `director/overview` sin ceros hardcodeados | esas páginas + actions | UI-H2 |
| 5.4 | Callejones sin salida: los botones y enlaces listados en UI-M; inbox o notificación del director; parámetro `?class`; enlaces a `/profile/change-password`; quitar textos de demo | páginas listadas | UI-M, L3 |
| 5.5 | Páginas huérfanas y duplicadas: enlazar o borrar las 14; el director con su propio layout de anuncios | `lib/nav/menu.ts` y páginas | UI-L1, M (director) |
| 5.6 | Errores tragados, spinners, `error.tsx` útil, `loading.tsx` y `not-found.tsx` | páginas listadas en UI-M | UI-M, L4 |
| 5.7 | Panamá: cédula en lugar de CURP, fechas `es-PA`, ejemplos locales | `TeacherStudentsClient.tsx`, `SettingsClient.tsx`, `academic`, formateo de fechas | UI-M (México) |
| 5.8 | Accesibilidad básica: `aria-label`, `role="dialog"` con foco y Escape, `htmlFor`, envío con Enter | componentes listados | UI-L5 |
| 5.9 | Activity feed: etiquetas de eventos de horario; emitir para notas, promoción, webhook y admisiones; `revalidatePath` en alumno y padre tras cambios de asistencia y notas | `activity.ts`, `lib/activity-taxonomy.ts`, actions afectadas | LOG-M (feed) |

**Aceptación del sprint:**
- Screenshots a 375px y 1440px de un flujo por rol.
- Ningún mensaje de error en inglés ni código crudo.
- Nombre real del usuario en todas las páginas.

### Sprint 6: Rendimiento, higiene y salida a producción
| ID | Tarea | Cierra |
|---|---|---|
| 6.1 | Quitar los N+1 (campana de notificaciones, inbox, reportes, dashboard del docente); `take` y paginación en las listas sin límite; conteo real de staff | UI-M (rendimiento) |
| 6.2 | `middleware.ts` → `proxy.ts`; `mustChangePassword` también se exige en las actions (vía authz) | PROC-5, SEG-L10 |
| 6.3 | Herramientas: sacar `.eslintcache` de git; un solo lockfile (npm; CI con `npm ci`); lint sobre `src/actions/**` y `src/lib/**`; arreglar los ~100 errores tsc de los tests e incluirlos en el typecheck de CI; los seams de test solo con `NODE_ENV==='test'` | PROC-4, PROC-5, SEG-L5 |
| 6.4 | Docs: `CLAUDE.md` (Postgres y migraciones), `GAP-ANALYSIS.md` y `FLUJOS.md` al día con esta auditoría | PROC-5 |
| 6.5 | Producción: Postgres gestionado con backups; env (`AUTH_SECRET`, Blob privado, Resend, Stripe); headers de seguridad y CSP; monitoreo de errores; job programado para recordatorios de cobro si se mantienen | GAP pendientes |
| 6.6 | Datos de menores: log de acceso a expedientes (salud, conducta) y política de retención | GAP seguridad de menores |

---

## Orden y paralelismo sugerido
```
S0 (secuencial) → S1 (12 workers ∥) → S2 (2.1a→2.1b→2.1c; 2.2→2.6/2.7; ∥ 2.3, 2.4; ⚠ 2.5 y 2.8 en serie)
                                     → S3 ∥ S4 (los ⚠ 3.3, 4.1 y 4.2 en serie entre sí) → S5 (∥ desde el fin de S1) → S6
```

## Verificación end-to-end
- **Por tarea:** el test rojo pasa a verde, y además `npm test`, `npx tsc --noEmit -p tsconfig.ci.json`, `npm run lint` y `npm run build`. Luego el CI de GitHub en verde tras el merge.
- **Por sprint:** el escenario de "Aceptación del sprint" de arriba. Los de S2–S4 se ejecutan como contract tests contra Postgres; los de S5, con navegador (Chrome MCP) a 375px y 1440px.
- **Regresión de seguridad:** los tests de matriz de autorización de S1 quedan permanentes en el runner.
- **Cierre:** re-correr esta misma auditoría (los 3 frentes) sobre `main` y comparar el conteo de hallazgos.

## Entregable tras la aprobación
1. Copiar este documento a `app/docs/AUDITORIA-2026-09.md`, sin commit hasta que lo pidas.
2. Esperar a que habilites los agentes para arrancar el Sprint 0.
