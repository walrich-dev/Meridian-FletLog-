// Ponto de entrada: coloca a API no ar.
//
// A aplicação em si é montada em app.ts, para que os testes automatizados
// possam usá-la sem precisar de um servidor fixo numa porta.
import { app } from './app.js';
import { enderecoDoBanco, pool } from './banco.js';

// A hospedagem escolhe a porta e a informa em PORT; na nossa máquina, 3333.
const porta = Number(process.env.PORT ?? 3333);

const servidor = app.listen(porta, () => {
  console.log(`Meridian API no ar na porta ${porta}, em /api`);
  console.log(`Banco: ${enderecoDoBanco()}`);
});

/** Encerra a conexão com o banco ao parar o servidor (Ctrl+C). */
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    servidor.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
