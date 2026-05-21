import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // jsPDF bundles a reference to html2canvas for its html() method which
      // we never call. Stub it out to save ~200 kB in the production bundle.
      'html2canvas': resolve('./src/stubs/html2canvas-stub.js'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'SGSV Monitor',
        short_name: 'SGSV',
        description: 'Sistema de gestion y monitoreo de siniestros SGSV.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sgsv-monitor-api\.jramospalomares274\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sgsv-worker-api',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
