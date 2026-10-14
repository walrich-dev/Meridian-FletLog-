// Autenticação por token (RNF01): o painel envia o cabeçalho
// "Authorization: Bearer <token>" em toda requisição que não seja pública.
import type { NextFunction, Request, Response } from 'express';
import { consultarUm, pool } from './banco.js';
import { ErroApi } from './erros.js';
import type { Perfil, Usuario } from './tipos.js';

/** Duração da sessão: 8 horas, cobrindo um turno de trabalho. */
export const DURACAO_SESSAO_HORAS = 8;

// Acrescenta o usuário logado ao objeto da requisição do Express
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

type LinhaSessao = Usuario & { ativo: boolean };

/**
 * Confere o token da requisição. A sessão precisa existir, não ter expirado e
 * pertencer a um usuário ainda ativo (RN10: inativar derruba o acesso na hora).
 */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  try {
    const cabecalho = req.header('authorization') ?? '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7).trim() : null;
    if (!token) throw new ErroApi('Faça login para continuar.', 401);

    const linha = await consultarUm<LinhaSessao>(
      pool,
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo
         FROM sessoes s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = $1 AND s.expira_em > NOW()`,
      [token],
    );

    if (!linha) throw new ErroApi('Sua sessão expirou. Entre novamente.', 401);
    if (!linha.ativo) throw new ErroApi('Seu acesso foi desativado.', 403);

    const { ativo: _ativo, ...usuario } = linha;
    req.usuario = usuario;
    next();
  } catch (erro) {
    next(erro);
  }
}

/** Restringe a rota a determinados perfis (ex.: só ADMIN gerencia usuários). */
export function apenasPerfis(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      next(new ErroApi('Você não tem permissão para realizar esta ação.', 403));
      return;
    }
    next();
  };
}

/** Usuário logado da requisição (as rotas protegidas sempre têm um). */
export function logado(req: Request): Usuario {
  if (!req.usuario) throw new ErroApi('Faça login para continuar.', 401);
  return req.usuario;
}
