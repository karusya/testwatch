import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api/* to the Fastify backend so the browser can call it
    // without CORS headaches during development.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
