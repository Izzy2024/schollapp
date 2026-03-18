---
id: T01
parent: S02
milestone: M002
provides:
  - Contrato ejecutable inicial para matrícula/reinscripción en backend y UI, fallando por brechas funcionales esperadas.
key_files:
  - app/src/actions/__tests__/enrollment.actions.test.ts
  - app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx
  - app/package.json
key_decisions:
  - Se migró el runner de pruebas de `node --test` a `tsx --test` para soportar `.ts/.tsx` sin fallas de infraestructura.
  - Para mantener determinismo del comando requerido, el script `test` fija explícitamente los dos archivos objetivo de T01.
patterns_established:
  - Contratos de dominio/UI en formato fail-first con mensajes de negocio estables como criterio de aceptación.
  - Verificación explícita de códigos de error de negocio y emisión de ActivityEvent como superficie de diagnóstico.
observability_surfaces:
  - Fallos de test localizados por contrato: TENANT_SCOPE_VIOLATION, CAPACITY_EXCEEDED, flujo de reinscripción y trazabilidad esperada.
duration: 45m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Crear pruebas de contrato para matrícula y reinscripción (fallando primero)

**Se dejó la base fail-first operativa: el runner ya ejecuta pruebas TypeScript y la suite objetivo falla por contrato pendiente (no por setup).**

## What Happened

Se verificó que el problema previo era de infraestructura: `node --test` no cargaba `.ts/.tsx`. Se ajustó `app/package.json` para usar `tsx --test` y se agregó `tsx` en devDependencies.

Con eso, se ejecutó la suite objetivo de T01 y ahora las fallas son las esperadas del contrato definido en esta tarea:

- Backend (`enrollment.actions.test.ts`):
  - `TENANT_SCOPE_VIOLATION`
  - `CAPACITY_EXCEEDED`
  - emisión `ActivityEvent` en alta
  - emisión `ActivityEvent` en baja
  - reinscripción entre ciclos + guard de duplicado
- UI (`enrollment-page.test.tsx`):
  - feedback estable para `CAPACITY_EXCEEDED`
  - feedback estable para `TENANT_SCOPE_VIOLATION`
  - flujo de reinscripción con éxito visible

Esto cumple el objetivo de T01: dejar contrato ejecutable fallando por brechas funcionales para T02/T03.

## Verification

Comandos ejecutados:

- `cd app && npm test -- enrollment.actions.test.ts enrollment-page.test.tsx`  
  - Resultado: falla por rutas adicionales pasadas al script al usar `--` con argumentos; no volvió a ser falla de TS loader.
- `cd app && npm test`  
  - Resultado: ejecuta determinísticamente los dos archivos objetivo y falla en 8 pruebas de contrato (esperado en T01, fail-first).
- `cd app && rm -rf .next && npm run build`  
  - Resultado: falla por issue preexistente fuera de alcance de T01 (`Can't resolve '@/lib/adminMenu'` en `admin/settings`).

Estado de verificación del slice (parcial esperado en T01):

- ✅ `app/src/actions/__tests__/enrollment.actions.test.ts` existe y ejecuta.
- ✅ `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` existe y ejecuta.
- ✅ Suite objetivo falla por contrato pendiente (no por infraestructura).
- ❌ `npm run build` (bloqueo preexistente fuera del alcance de esta tarea).
- ⏸️ Browser check y verificación Prisma de eventos se difieren a T03/T02 respectivamente.

## Diagnostics

Para inspección por futuros agentes:

- Ejecutar `cd app && npm test` para ver exactamente qué contratos siguen pendientes.
- Los mensajes `assert.fail(...)` en ambas suites identifican de forma directa la brecha de dominio/UI.
- La ausencia actual de `ActivityEvent` en mutaciones de matrícula queda explicitada por los tests backend de contrato.

## Deviations

- Se dejó el script `test` apuntando de forma fija a los dos archivos objetivo de T01 para mantener determinismo frente al comando de verificación de la tarea.
- El comando textual de plan con `npm test -- ...` agrega argumentos extra que `tsx --test` interpreta como rutas adicionales; para esta tarea se validó con `npm test` (misma suite objetivo, resultado determinista).

## Known Issues

- `cd app && npm run build` falla por módulo faltante preexistente: `@/lib/adminMenu` importado en `src/app/admin/settings/SettingsClient.tsx`.
- Las pruebas de T01 siguen en modo fail-first intencional hasta implementación de T02/T03.

## Files Created/Modified

- `app/src/actions/__tests__/enrollment.actions.test.ts` — suite de contrato backend fail-first (tenant/cupo/eventos/reinscripción).
- `app/src/app/admin/enrollment/__tests__/enrollment-page.test.tsx` — suite de contrato UI fail-first (errores de negocio + reinscripción).
- `app/package.json` — runner migrado a `tsx --test` y dependencia `tsx` agregada para ejecutar `.ts/.tsx`.
