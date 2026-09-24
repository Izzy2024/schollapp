# S02 UAT: Registro manual de pagos + Estado de cuenta Parent (M003)

## Objetivo
Validar que un Admin registra un pago manual y un Parent ve saldo/historial determinista en `/parent/finances`.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Usuario admin: `admin@demo.com` / `demo-hash-123`
- Usuario parent: `padre@demo.com` / `demo-hash-123`

## Caso 1 — Admin genera cargos
1. Login como Admin.
2. Ir a `/admin/finances`.
3. (Si aplica) crear concepto mensual y generar cargos para un periodo.
4. Expected: cargos aparecen para alumnos.

## Caso 2 — Admin registra pago manual
1. En un cargo, usar "Registrar pago".
2. Monto parcial (ej. 250) y método "Efectivo".
3. Guardar.
4. Expected: el cargo refleja pago / saldo actualizado.

## Caso 3 — Parent ve estado de cuenta real
1. Login como Parent.
2. Ir a `/parent/finances`.
3. Expected: se ve historial de cargos/pagos y saldo = sum(cargos) - sum(pagos).

## Señales de fallo
- Saldo inconsistente entre refresh.
- El pago no aparece en historial.
- Acceso cross-tenant o RBAC incorrecto.
