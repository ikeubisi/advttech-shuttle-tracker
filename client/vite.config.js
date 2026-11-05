import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['building.jpeg'],
      manifest: {
        name: 'ADvTECH Shuttle Tracker',
        short_name: 'ADvTECH Shuttle',
        description: 'ADvTECH Shuttle Tracking Application',
        theme_color: '#102b50',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,png,jpg,jpeg,svg,ico}'],
        navigateFallback: null,
        runtimeCaching: []
      }
    })
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['ike.tailcd512f.ts.net'],
    proxy: {
      '/api': 'http://127.0.0.1:4001'
    }
  }
});
