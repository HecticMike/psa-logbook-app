import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pagesBase = process.env.VITE_BASE ?? '/psa-logbook-app/';

export default defineConfig({
  base: pagesBase,
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PsA Logbook',
        short_name: 'PsA Logbook',
        start_url: pagesBase,
        display: 'standalone',
        background_color: '#f6f7f3',
        theme_color: '#246e60',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}']
      }
    })
  ]
});
