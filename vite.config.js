import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El sitio se publica en GitHub Pages como project page:
// https://revan274.github.io/sgsv-monitorR/  -> base = '/sgsv-monitorR/'
// En desarrollo se sirve en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/sgsv-monitorR/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
}));
