# S05 RUNBOOK — Lanzamiento (happy path + failure visibility)

**Slice:** S05 — Integración final “Lanzamiento” (happy path + failure visibility)  
**Milestone:** M003  
**Objetivo:** Cualquier dev puede levantar una demo reproducible (DB limpia), ejecutar el flujo Admin→Parent de Finanzas, ver eventos `finance.*` en Activity Feed, y comprobar un caso determinista de fallo con **código estable** visible.

> Nota: Este runbook asume entorno **dev local**. Las credenciales aquí documentadas son **solo dev** y son deterministas.

---

## 0) Pre-flight (DB limpia + migraciones + seed + dev server)

Desde repo root:

```bash
pnpm -C app install

# IMPORTANT: db:reset runs prisma migrate reset and re-generates Prisma Client.
# If you skip this (or prisma generate), you can hit build/runtime errors like:
# "Property 'financeConcept' does not exist on type PrismaClient".
pnpm -C app run db:reset

# Seed depends on the reset schema + generated client.
pnpm -C app run db:seed

pnpm -C app dev
```

**Expected observations**
- `pnpm -C app run db:reset` recrea el schema y deja DB limpia.
- `pnpm -C app run db:seed` termina con `Seeding finished.`
- (Opcional) `pnpm -C app run db:seed:check` imprime JSON con `tenant/admin/parentUser/guardian/student/link: true`.
- `pnpm -C app dev` levanta Next.js (por defecto en `http://localhost:3000`).

---

## 1) Credenciales demo (deterministas, solo dev)

**Tenant demo (seed):** `school-demo`

**Password (dev-only para todos estos usuarios):**
- `demo-hash-123`

Usuarios seed:
- Admin: `admin@demo.com`
- Director: `director@demo.com`
- Parent/Guardian (para /parent/finances): `padre@demo.com` *(nota: requiere que el usuario tenga `guardianId` en sesión; actualmente este seed crea Guardian+link pero el login no inyecta guardianId automáticamente)*
- Docente (para failure visibility RBAC): `docente-rbac@demo.com`

---

## 2) Happy path (Admin → Finanzas)

### 2.1 Entrar como Admin

1. Navega a `http://localhost:3000`.
2. Inicia sesión con:
   - Email: `admin@demo.com`
   - Password: `demo-hash-123`

**Expected observations**
- La sesión queda activa y puedes navegar a superficies `/admin/*`.

### 2.2 Crear Concepto

Ruta:
- `/admin/finances`

Acción:
- En tab **Conceptos**: crear un concepto, p.ej.
  - Nombre: `Colegiatura`
  - Monto: `1000` (moneda según UI; en backend suele persistir en centavos)

**Expected observations**
- Concepto aparece en la tabla/lista sin recargar.

### 2.3 Generar Cargos para un periodo

En `/admin/finances` (tab **Cargos** o flujo equivalente):
- Selecciona periodo `2025-09` (o el campo de periodo que use formato `YYYY-MM`).
- Genera cargos para alumnos.

**Expected observations**
- Aparecen cargos para al menos **1 estudiante**.
- No hay pantallas en blanco: si algo falla, debe mostrarse un bloque de error con `Código:`.

### 2.4 Registrar Pago

En `/admin/finances` (tab **Pagos** o modal equivalente):
- Selecciona un cargo del estudiante.
- Registra un pago manual (p.ej. `500`).

**Expected observations**
- El pago se refleja en la lista.

---

## 3) Activity Feed (eventos `finance.*`)

Ruta:
- `/admin/activity` (o la ruta real de Activity en este proyecto)

**Expected observations**
- Se ven eventos `finance.*` (ejemplos típicos: creación de concepto, generación de cargos, registro de pago).
- **Redaction constraint:** metadata NO debe incluir PII (sin emails/nombres/notas libres). Debe contener ids/montos/periodo.

> Troubleshooting rápido:
> - Si no ves la ruta: usa el menú Admin o busca "Activity".
> - Si no hay eventos: confirma que las acciones de Finanzas realmente persistieron (ver sección 6).

---

## 4) Happy path (Parent → `/parent/finances`)

### 4.1 Entrar como Parent

Cierra sesión y entra con:
- Email: `padre@demo.com`
- Password: `demo-hash-123`

Ruta:
- `/parent/finances`

**Expected observations**
- La pantalla muestra al menos 1 estudiante vinculado al guardian (seed link a `STD-001`).
- Debe verse historial/filas de cargos/pagos (según UI).
- **Criterio de balance:**
  - `balanceDueCents = totalChargesCents - totalPaymentsCents`
  - Si generaste `1000` y pagaste `500`, el saldo esperado es `500` (en la unidad que muestre la UI).

**Current known issue (para M003/S05):**
- El server-action `getForParent()` requiere `session.user.guardianId`. El seed crea un `Guardian` y el link `StudentGuardian`, pero el login (NextAuth) todavía **no inyecta** `guardianId` a la sesión del usuario `padre@demo.com`.
- Resultado actual reproducible: `/parent/finances` muestra error visible `Código: INVALID_TARGET` (failure visibility OK), pero **no** puede completar el happy-path Parent sin un puente adicional (p.ej. mapear User→Guardian o inyectar guardianId en sesión).

---

## 5) Failure visibility (caso determinista con código estable)

Objetivo: comprobar que un fallo de RBAC en Finanzas **no es silencioso** y que la UI muestra un `Código:` con el error estable esperado.

### Caso: Docente intenta acceder a Admin Finanzas

1. Cierra sesión.
2. Inicia sesión con:
   - Email: `docente-rbac@demo.com`
   - Password: `demo-hash-123`
3. Ve a:
   - `/admin/finances`
4. Intenta ejecutar alguna acción de escritura (crear concepto / generar cargos / registrar pago).

**Expected observations**
- La UI **no** se queda cargando indefinidamente.
- La UI muestra un error visible con:
  - `Código: STABLE_ERROR.FINANCE_FORBIDDEN`

> Nota: Esto está alineado con el contract test `S05 failure visibility contract (finance server actions)` que asegura propagación determinista del código estable.

---

## 6) Troubleshooting mínimo

### A) Parent no ve estudiantes / statement vacío

- Verifica que el seed link existe (Guardian ↔ Student):
  - El seed vincula `padre@demo.com` (guardian) a `STD-001`.
- Si el statement sigue vacío:
  - Confirma que generaste cargos para el periodo y que el cargo corresponde a ese estudiante.

### B) No hay eventos en Activity

- Confirma que realizaste acciones que escriben (create concept / generate charges / add payment).
- (Opcional) Prisma Studio:
  ```bash
  pnpm -C app prisma studio
  ```
  Busca tablas:
  - `ActivityEvent`
  - `FinanceConcept`, `FinanceCharge`, `FinancePayment`

### C) No aparece `Código:` ante fallos

- En Admin Finanzas, las superficies deben renderizar `StableErrorUi` (AntD Alert) cuando hay error.
- Revisa consola del browser y `pnpm -C app dev` logs para stack traces (no es fuente primaria, solo apoyo).

---

## 7) Idempotencia

Este seed es **idempotente** para los datos demo (usa upserts/creates controlados). Puedes correr:

```bash
pnpm -C app prisma db seed
```

múltiples veces sin duplicar relaciones clave (tenant/memberships/sections/enrollments, y link guardian↔student).
