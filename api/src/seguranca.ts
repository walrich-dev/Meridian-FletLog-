// Proteções de produção: cabeçalhos HTTP e limite de tentativas por IP.
//
// O limite existe porque o bcrypt deixa a conferência de senha lenta, mas não
// impede alguém de tentar milhares de combinações. Nos testes automatizados ele
// é desligado (LIMITE_TAXA=desligado), senão a própria suíte seria bloqueada.
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import helmet from 'helmet';
import type { RequestHandler } from 'express';

const MINUTO = 60_000;

const ligado = process.env.LIMITE_TAXA !== 'desligado';

/** Quando desligado, vira um middleware que só segue adiante. */
const semLimite: RequestHandler = (_req, _res, next) => next();

function limite(opcoes: {
  janelaMs: number;
  tentativas: number;
  mensagem: string;
  ignorarSucesso?: boolean;
}): RateLimitRequestHandler | RequestHandler {
  if (!ligado) return semLimite;

  return rateLimit({
    windowMs: opcoes.janelaMs,
    limit: opcoes.tentativas,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: opcoes.ignorarSucesso ?? false,
    // Mesmo formato de erro das outras respostas, para o painel exibir a mensagem
    handler: (_req, res) => {
      res.status(429).json({ mensagem: opcoes.mensagem });
    },
  });
}

/**
 * Login: 10 tentativas erradas a cada 15 minutos, por IP.
 * Acertos não contam, então quem sabe a senha nunca é bloqueado.
 */
export const limiteLogin = limite({
  janelaMs: 15 * MINUTO,
  tentativas: 10,
  ignorarSucesso: true,
  mensagem: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
});

/** Troca de senha: 5 por hora, por IP. */
export const limiteSenha = limite({
  janelaMs: 60 * MINUTO,
  tentativas: 5,
  ignorarSucesso: true,
  mensagem: 'Muitas trocas de senha seguidas. Tente novamente mais tarde.',
});

/** Resto da API: 300 requisições por minuto, por IP. Folgado para uso normal. */
export const limiteGeral = limite({
  janelaMs: MINUTO,
  tentativas: 300,
  mensagem: 'Muitas requisições. Aguarde um instante e tente novamente.',
});

/**
 * Cabeçalhos de segurança. A política de conteúdo fica desligada porque a API
 * só devolve JSON: quem serve o painel (e o HTML) é o front-end.
 */
export const cabecalhosSeguros = helmet({ contentSecurityPolicy: false });
