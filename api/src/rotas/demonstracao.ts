// Restauração dos dados de demonstração.
//
// Apaga tudo e recria a frota de exemplo. É útil antes de uma apresentação, mas
// perigoso em um sistema em uso, então só funciona quando
// PERMITIR_RESTAURAR_DEMONSTRACAO=true está definido no .env.
//
// Em produção a rota fica desligada mesmo com a variável ligada: um .env de
// desenvolvimento copiado por engano para o servidor não apaga a frota real.
import { Router } from 'express';
import { apenasPerfis, autenticar } from '../autenticacao.js';
import { emTransacao } from '../banco.js';
import { ErroApi } from '../erros.js';
import { popularBanco } from '../scripts/popular-banco.js';

export const permitirRestaurar =
  process.env.PERMITIR_RESTAURAR_DEMONSTRACAO === 'true' && process.env.NODE_ENV !== 'production';

export const rotasDemonstracao = Router();

rotasDemonstracao.use(autenticar, apenasPerfis('ADMIN'));

rotasDemonstracao.post('/restaurar', async (_req, res) => {
  if (!permitirRestaurar) {
    throw new ErroApi('A restauração dos dados de demonstração está desligada nesta instalação.', 403);
  }

  // Tudo numa transação: ou o banco inteiro volta ao estado inicial, ou nada muda
  await emTransacao(popularBanco);
  res.status(204).end();
});
