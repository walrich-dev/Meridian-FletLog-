import { defineConfig } from 'vitest/config';

// Os testes usam um banco separado (meridian_teste), que é recriado a cada
// execução. Assim os dados de demonstração do banco principal não são apagados.
process.loadEnvFile('.env');

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // LIMITE_TAXA desligado: senão a própria suíte seria barrada por excesso
    // de tentativas de login.
    env: { PGDATABASE: 'meridian_teste', LIMITE_TAXA: 'desligado' },
    // As rotas compartilham o mesmo banco, então os arquivos rodam um de cada vez
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
