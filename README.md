# APPSSCHOLL Workspace

Este workspace contiene:

- `app/`: aplicación web principal (Next.js + Prisma)
- `plan/`: archivos de planeación funcional
- `stitch_assets/`: diseños/insumos visuales

## Documentación principal

La documentación actualizada del sistema está en:

- `app/README.md`
- `app/docs/ARQUITECTURA.md`
- `app/docs/FLUJOS.md`
- `app/docs/CAMBIOS_RECIENTES.md`

## Levantar app

```bash
cd app
npm install
npx prisma db push
npm run dev
```

Abrir en `http://localhost:3000`.
