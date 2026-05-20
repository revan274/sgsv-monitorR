# SGSV Monitor

Sistema de Gestión y Seguimiento de Vigilancia para empresas de seguridad. Una PWA construida con React, Zustand y Supabase para registrar y analizar incidentes de seguridad en tiempo real.

## 🚀 Características Principales

- **Gestión de Siniestros**: Registro de incidentes con imágenes, tipos, severidad y estado de seguimiento.
- **Lista Negra (PCP)**: Base de datos de Personas Con Precedentes (PCP) con galería de hasta 12 imágenes.
- **Offline-First**: Funciona sin conexión a internet usando IndexedDB y sincroniza automáticamente al recuperar la red.
- **PWA Instalable**: Puede instalarse en escritorio o dispositivos móviles y recibir actualizaciones.
- **Dashboard y Analítica**: Gráficos interactivos de tendencias a 60 días e indicadores clave de rendimiento (KPIs) por ubicación.
- **Reportes y Exportación**: Generación de reportes PDF detallados y exportación CSV de la bitácora de incidentes.
- **Control de Acceso Basado en Roles (RBAC)**: Diferenciación estricta de permisos entre Administradores y Operadores.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, Vite 8, TypeScript
- **Estilos**: TailwindCSS 4, Lucide React
- **Estado**: Zustand 5
- **Backend / DB**: Supabase (Autenticación, Postgres y Storage)
- **Persistencia Local**: `idb-keyval` (IndexedDB)
- **Gráficos y Reportes**: Recharts, jsPDF, html2canvas

## ⚙️ Instalación y Desarrollo Local

1. **Clonar e instalar dependencias:**
   ```bash
   git clone <repo-url>
   cd sgsv-monitor
   npm install
   ```

2. **Configuración de Variables de Entorno:**
   Copia el archivo `.env.example` a `.env` y añade las credenciales de tu proyecto Supabase:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

## 📦 Despliegue

La aplicación se puede compilar para producción ejecutando:
```bash
npm run build
```
La carpeta `dist` contendrá los archivos listos para ser servidos por cualquier CDN o servidor web estático (como Vercel, Netlify o Render).

## 🗄️ Configuración de Supabase

Para que el backend funcione correctamente, asegúrate de:
1. **Ejecutar el Schema SQL**: Aplica el archivo `supabase/schema.sql` en el SQL Editor de tu proyecto Supabase para crear las tablas (`incidentes`, `personas_interes`, `turnos`, `app_config`, etc.).
2. **Habilitar Realtime**: Ve a Database > Replication y habilita Realtime para las tablas mencionadas.
3. **Configurar Storage**: Crea un bucket llamado `media` y configura las políticas públicas para lectura y escritura autenticada.

---
*Diseñado con enfoque en alta disponibilidad y experiencia de usuario moderna (Glassmorphism).*
