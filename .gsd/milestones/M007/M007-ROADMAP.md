# M007: 

## Vision
Eliminar fricción recurrente en login cuando falta data inicial (seed) y evitar drift de navegación por rol consolidando el menú en una sola fuente tipada. En dev, si falta seed, el login debe fallar de forma controlada con un mensaje accionable (no CallbackRouteError) y con guía clara para ejecutar `prisma db seed`.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Seed estándar: prisma db seed + dataset mínimo para auth | high | — | ✅ | `prisma db seed` en DB vacía; luego login funciona con usuario seeded. |
| S02 | Login sin seed: error manejado + mensaje accionable (no CallbackRouteError) | high | S01 | ✅ | Con DB vacía, intentar login muestra error accionable (sin crash); luego tras seed, login ok. |
| S03 | Menús por rol: single source tipada + adopción en layouts | medium | S02 | ✅ | Cambiar de rol cambia menú; no hay 404 desde navegación principal; una sola definición alimenta todo. |
