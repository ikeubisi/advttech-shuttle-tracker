import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,

    allowedHosts: ['ike.tailcd512f.ts.net'],

    proxy: {
      '/api': 'http://127.0.0.1:4001',
    },
  },
});