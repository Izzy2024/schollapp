---
id: M006
title: "Auditoría por rol + cierre de 404 (páginas en construcción) + hardening navegación"
status: complete
completed_at: 2026-03-27T19:36:48.713Z
key_decisions:
  - Estrategia A: reemplazar rutas faltantes por placeholders "En construcción" en vez de ocultarlas o implementarlas completas ahora.
  - Incluir label textual "En construcción" para diferenciar placeholder vs bug real y permitir asserts/smoke.
key_files:
  - .gsd/milestones/M006/M006-ROADMAP.md
  - .gsd/milestones/M006/M006-VALIDATION.md
  - .gsd/milestones/M006/slices/S01/S01-INVENTORY.md
  - .gsd/milestones/M006/slices/S03/S03-INVENTORY-UPDATED.md
  - .gsd/milestones/M006/slices/S03/S03-UAT.md
  - app/src/components/UnderConstructionPage.tsx
  - app/src/app/student/**
  - app/src/app/admin/**
  - app/src/app/director/**
  - app/src/app/teacher/**
  - app/src/app/parent/**
lessons_learned:
  - Los menús estaban duplicados por página y podían apuntar a rutas no implementadas; un inventario por rol ayuda a controlar regresiones.
  - El login demo falla sin seed; UAT/runbook deben incluir la precondición `node app/prisma/seed.ts`.
  - `next dev` puede crashear por lock/puerto ocupado si quedan instancias previas; matar el proceso en 3000 antes de reiniciar.
---

# M006: Auditoría por rol + cierre de 404 (páginas en construcción) + hardening navegación

**Menús por rol dejan de llevar a 404; rutas faltantes ahora muestran páginas 'En construcción' consistentes con UAT e inventario trazable.**

## What Happened

M006 abordó el problema de experiencia roto por rol: múltiples opciones de menú apuntaban a rutas inexistentes (404), especialmente en Student.

Se ejecutó una auditoría runtime por rol para mapear rutas del menú a estado (OK/404) y se priorizaron fixes. Luego se aplicó una estrategia consistente (opción A): para cada ruta no implementada expuesta en menú, se creó una página placeholder con label "En construcción" y CTAs de regreso.

Se consolidó evidencia:
- Inventario inicial (OK/404)
- Inventario actualizado (OK/UC)
- UAT por rol para smoke reproducible
- Gates lint/test/build en verde

Resultado: 0 rutas 404 expuestas desde menús principales para Admin/Director/Teacher/Parent/Student (según inventario).

## Success Criteria Results

- Menús principales sin 404 por rol: cumplido (inventario S01 + placeholders S02 + inventario actualizado S03).
- Inventario trazable por rol: cumplido (S01-INVENTORY.md y S03-INVENTORY-UPDATED.md).
- UAT por rol: cumplido (S03-UAT.md).
- Gates verdes: cumplido (`pnpm -C app lint/test/build`).

## Definition of Done Results

- S01–S03 completadas.
- Artifacts de auditoría y UAT escritos.
- Build/test/lint en verde.
- Smoke runtime documentado y verificado en rutas representativas.

## Requirement Outcomes

Sin cambios al contrato de requirements (ya validated). Este milestone reduce deuda de UX/operación eliminando 404 visibles.

## Deviations

Se corrigió un problema operativo de dev server (lock/puerto ocupado) terminando una instancia huérfana de Next.

Durante smoke, se re-ejecutó seed para evitar CallbackRouteError.

## Follow-ups

Opcional:
- Consolidar menús por rol (single source) para evitar links muertos.
- Estandarizar seed agregando `prisma.seed` en `app/package.json` para habilitar `prisma db seed`.
