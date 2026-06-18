# SGSV Monitor v2

Sistema de control de siniestros y videovigilancia. Aplicación **100% frontend** (React + Vite) con almacenamiento local en el navegador (IndexedDB) a través de una **capa de datos intercambiable**.

## Stack

- **React 18** + **Vite 6**
- **Tailwind CSS 4** (vía `@tailwindcss/vite`)
- **Recharts** para gráficos
- **idb-keyval** (IndexedDB) como almacenamiento por defecto

## Desarrollo

```bash
npm install
npm run dev      # arranca en http://localhost:5173
```

Otros scripts:

```bash
npm run build    # build de producción en dist/
npm run preview  # sirve el build
npm run lint     # ESLint
```

## Arquitectura

```
src/
  domain/        Lógica pura sin React: constantes, normalización, utils, imágenes
  data/          Capa de datos abstracta (repository) + impl. IndexedDB
  hooks/         Hooks reutilizables (colección persistente, notificaciones)
  components/    UI compartida (Modal, Lightbox, Sidebar, Chart, Slider, Pagination)
  views/         Vistas: Dashboard, Nuevo Evento, Historial, PCP
  App.jsx        Orquestación y estado global
```

### Cambiar el almacenamiento

La app **nunca** importa una implementación concreta; usa `repository` (`src/data/repository.js`).
Para migrar a un backend, basta crear `src/data/apiRepository.js` con la misma interfaz
(`loadIncidents`, `saveIncidents`, `loadPersonas`, `savePersonas`) y registrarlo en el factory.
Se puede seleccionar backend con `VITE_STORAGE_BACKEND`.

## Datos y privacidad

Los datos (incluyendo fotos de personas) se guardan **sin cifrar** en IndexedDB del navegador,
en el dispositivo. No salen a ningún servidor. Tenlo en cuenta para el manejo de datos personales.

## Historial

El proyecto v1 (React 19 + TypeScript + backend Express/Postgres) queda archivado en
la rama `archive/v1-fullbackup` y el tag `v1-archive`.
