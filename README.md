# SGSV Monitor

Sistema cloud para gestion y seguimiento de vigilancia. La aplicacion usa React/Vite en el frontend y una API Node/Express con Postgres como fuente de verdad.

## Arquitectura

- Frontend: React 19, Vite 8, Zustand y TailwindCSS.
- Backend: Node/Express en `server/`.
- Base de datos: Postgres via `DATABASE_URL`.
- Auth: sesiones firmadas por API, usuarios y roles en tabla `users`.
- Storage: Supabase Storage para evidencias cuando se configuran `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET`.
- Deploy recomendado: un solo servicio web que hace `npm run build` y arranca `npm run start:server`.

## Desarrollo Local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde `.env.example` y configurar:

```env
VITE_API_URL=http://localhost:4000
PORT=4000
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=change-this-long-random-secret
ADMIN_EMAIL=admin@sgsv.local
ADMIN_PASSWORD=ChangeMe.SGSV.123
```

El backend carga `.env` automaticamente en desarrollo. En produccion se usan las variables del proveedor de hosting.

3. Arrancar API y frontend en terminales separadas:

```bash
npm run dev:server
npm run dev
```

El backend inicializa el esquema y crea el usuario administrador inicial solo si la tabla `users` esta vacia.

## Produccion

Build:

```bash
npm run build
```

Start:

```bash
npm run start:server
```

En produccion debes definir:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

Si el frontend se sirve desde el mismo backend, `VITE_API_URL` puede omitirse y la app usara rutas relativas `/api`.

## Verificacion

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Nota Cloud-Only

SGSV opera estrictamente como un sistema **Cloud-Only**. La API y PostgreSQL son la **única fuente de verdad**. 
No se utiliza IndexedDB ni localStorage para datos de negocio. Las rutas `/api` requieren red constante; en caso de fallo o desconexión, la interfaz de usuario bloqueará las operaciones garantizando que no se generen estados inconsistentes.

## Estado de Endurecimiento (Mesa TI)

- La API es la única vía para persistir información (sin caminos ambiguos offline).
- Las evidencias se procesan eficientemente en formato binario (`Blob/FormData`) a Supabase Storage, sin inflar memoria con Base64.
- La PWA no hace caché de datos de negocio (`/api`).
- Los roles y permisos están sólidamente validados en el servidor.
