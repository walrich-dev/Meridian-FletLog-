// Monta a aplicação Express: rotas e tratamento de erros.
//
// O arquivo index.ts é quem a coloca no ar; aqui ela fica pronta para ser usada
// também pelos testes automatizados. Os erros viram respostas HTTP no
// formato que o painel espera: { mensagem, detalhes: { campo: [...] } }.
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { pool } from './banco.js';
import { ErroApi } from './erros.js';
import { rotasAlertas } from './rotas/alertas.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasConfiguracoes } from './rotas/configuracoes.js';
import { rotasDashboard } from './rotas/dashboard.js';
import { rotasDemonstracao } from './rotas/demonstracao.js';
import { rotasManutencoes } from './rotas/manutencoes.js';
import { rotasMotoristas } from './rotas/motoristas.js';
import { rotasUsuarios } from './rotas/usuarios.js';
import { rotasVeiculos } from './rotas/veiculos.js';
import { cabecalhosSeguros, limiteGeral } from './seguranca.js';

const app = express();

/**
 * Atrás de uma hospedagem (Render, Railway, Fly...) a requisição chega por um
 * proxy, e sem isto o Express veria o IP do proxy em todas elas: o limite por
 * IP valeria para o site inteiro de uma vez. CONFIAR_PROXY recebe o número de
 * proxies na frente da API (normalmente 1).
 */
const confiarProxy = Number(process.env.CONFIAR_PROXY ?? 0);
if (confiarProxy > 0) app.set('trust proxy', confiarProxy);

app.use(cabecalhosSeguros);

/**
 * CORS: o navegador só deixa o painel chamar a API se ela autorizar o endereço
 * de onde a página veio.
 *
 * ORIGEM_PERMITIDA aceita vários endereços separados por vírgula. Além deles,
 * em desenvolvimento qualquer porta de localhost é aceita, porque o Vite muda
 * de porta sozinho (5174, 5175...) quando a 5173 já está ocupada.
 */
const origensPermitidas = (process.env.ORIGEM_PERMITIDA ?? 'http://localhost:5173')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

const emProducao = process.env.NODE_ENV === 'production';
const ehLocalhost = (origem: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem);

app.use(
  cors({
    origin(origem, responder) {
      // Sem origem: chamadas que não vêm do navegador (curl, testes, outro servidor)
      if (!origem) return responder(null, true);
      if (origensPermitidas.includes(origem)) return responder(null, true);
      if (!emProducao && ehLocalhost(origem)) return responder(null, true);
      responder(new Error(`Origem não autorizada: ${origem}`));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));

// Situação da API e do banco: útil para conferir se tudo está no ar
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'conectado', horario: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'erro', banco: 'desconectado', horario: new Date().toISOString() });
  }
});

// O limite geral vem depois do /health, para o monitoramento da hospedagem
// (que consulta a toda hora) nunca ser barrado.
app.use('/api', limiteGeral);

app.use('/api/auth', rotasAuth);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/veiculos', rotasVeiculos);
app.use('/api/motoristas', rotasMotoristas);
app.use('/api/manutencoes', rotasManutencoes);
app.use('/api/alertas', rotasAlertas);
app.use('/api/dashboard', rotasDashboard);
app.use('/api/configuracoes', rotasConfiguracoes);
app.use('/api/demonstracao', rotasDemonstracao);

// Rota inexistente
app.use((req, res) => {
  res.status(404).json({ mensagem: `Rota não encontrada: ${req.method} ${req.path}` });
});

// -----------------------------------------------------------------------------
// Tratamento de erros: o último middleware, com quatro parâmetros
// -----------------------------------------------------------------------------

/** Códigos de erro do PostgreSQL que viram mensagens para o usuário. */
const ERROS_POSTGRES: Record<string, { status: number; mensagem: string }> = {
  '23505': { status: 409, mensagem: 'Já existe um cadastro com estes dados.' },
  '23503': { status: 400, mensagem: 'O registro informado não existe ou está em uso.' },
  '23514': { status: 400, mensagem: 'Os dados informados não atendem às regras do sistema.' },
};

app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof ErroApi) {
    res.status(erro.status).json({ mensagem: erro.message, detalhes: erro.detalhes });
    return;
  }

  // Dados que não passaram na validação: a mensagem vai para o campo do formulário
  if (erro instanceof ZodError) {
    res.status(400).json({ mensagem: 'Dados inválidos.', detalhes: z.flattenError(erro).fieldErrors });
    return;
  }

  const codigo = (erro as { code?: string }).code;
  const conhecido = codigo ? ERROS_POSTGRES[codigo] : undefined;
  if (conhecido) {
    res.status(conhecido.status).json({ mensagem: conhecido.mensagem });
    return;
  }

  console.error('[API]', erro);
  res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});


export { app };
