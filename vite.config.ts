import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  test: {
    // Os testes cobrem as regras de negócio e a API simulada, sem navegador
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
