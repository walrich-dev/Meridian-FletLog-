// RNF01: login, sessão e troca de senha.
import { Router } from 'express';
import { z } from 'zod';
import { autenticar, DURACAO_SESSAO_HORAS, logado } from '../autenticacao.js';
import { consultarUm, emTransacao, pool } from '../banco.js';
import { ErroApi } from '../erros.js';
import { conferirSenha, gerarHashSenha, gerarToken } from '../regras/senha.js';
import { email, senha } from '../regras/validacao.js';
import type { Perfil } from '../tipos.js';

const loginSchema = z.object({
  email,
  // No login não vale a regra de tamanho mínimo: a senha só é comparada com a cadastrada
  senha: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

const trocarSenhaSchema = z.object({
  senhaAtual: z.string({ error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.'),
  novaSenha: senha,
});

type LinhaUsuario = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  senhaHash: string;
};

export const rotasAuth = Router();

rotasAuth.post('/login', async (req, res) => {
  const dados = loginSchema.parse(req.body);

  const usuario = await consultarUm<LinhaUsuario>(
    pool,
    `SELECT id, nome, email, perfil, ativo, senha_hash AS "senhaHash" FROM usuarios WHERE email = $1`,
    [dados.email],
  );

  // Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem.
  // A senha é conferida mesmo sem usuário, para o tempo de resposta não denunciar a diferença.
  const hashParaConferir = usuario?.senhaHash ?? '$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalidoinva';
  const senhaCorreta = await conferirSenha(dados.senha, hashParaConferir);

  if (!usuario || !senhaCorreta) {
    throw new ErroApi('E-mail ou senha incorretos.', 401);
  }
  if (!usuario.ativo) {
    throw new ErroApi('Usuário inativo. Procure o administrador do sistema.', 403);
  }

  const token = gerarToken();
  await emTransacao(async (executor) => {
    // Aproveita para limpar as sessões que já venceram
    await executor.query('DELETE FROM sessoes WHERE expira_em <= NOW()');
    await executor.query(
      `INSERT INTO sessoes (token, usuario_id, expira_em) VALUES ($1, $2, NOW() + ($3 || ' hours')::INTERVAL)`,
      [token, usuario.id, DURACAO_SESSAO_HORAS],
    );
  });

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  });
});

rotasAuth.post('/logout', autenticar, async (req, res) => {
  const token = (req.header('authorization') ?? '').slice(7).trim();
  await pool.query('DELETE FROM sessoes WHERE token = $1', [token]);
  res.status(204).end();
});

rotasAuth.get('/me', autenticar, (req, res) => {
  res.json(logado(req));
});

rotasAuth.put('/senha', autenticar, async (req, res) => {
  const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body);
  const usuario = logado(req);

  const linha = await consultarUm<{ senhaHash: string }>(
    pool,
    `SELECT senha_hash AS "senhaHash" FROM usuarios WHERE id = $1`,
    [usuario.id],
  );
  if (!linha) throw new ErroApi('Usuário não encontrado.', 404);

  if (!(await conferirSenha(senhaAtual, linha.senhaHash))) {
    throw new ErroApi('A senha atual está incorreta.', 400, { senhaAtual: ['A senha atual está incorreta.'] });
  }

  await pool.query('UPDATE usuarios SET senha_hash = $1, atualizado_em = NOW() WHERE id = $2', [
    await gerarHashSenha(novaSenha),
    usuario.id,
  ]);
  res.status(204).end();
});
