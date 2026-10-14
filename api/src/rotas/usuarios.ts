// Gestão de usuários (somente ADMIN).
import { Router } from 'express';
import { z } from 'zod';
import { apenasPerfis, autenticar, logado } from '../autenticacao.js';
import { consultar, consultarUm, emTransacao, pool } from '../banco.js';
import { garantirUnico } from '../consultas.js';
import { ErroApi } from '../erros.js';
import { gerarHashSenha } from '../regras/senha.js';
import { email, lerId, opcional, senha, texto } from '../regras/validacao.js';
import type { UsuarioCadastro } from '../tipos.js';

const perfil = z.enum(['ADMIN', 'GESTOR'], { error: 'Selecione o perfil: ADMIN ou GESTOR.' });

const criarSchema = z.object({ nome: texto(120), email, perfil: perfil.default('GESTOR'), senha });

const atualizarSchema = z.object({
  nome: texto(120),
  email,
  perfil,
  ativo: z.boolean({ error: 'Informe se o usuário está ativo.' }),
  // Preenchida apenas quando o administrador quer redefinir a senha do usuário
  novaSenha: opcional(senha),
});

// O hash da senha nunca sai da API
const COLUNAS = `id, nome, email, perfil, ativo, criado_em AS "criadoEm"`;

export const rotasUsuarios = Router();

rotasUsuarios.use(autenticar, apenasPerfis('ADMIN'));

rotasUsuarios.get('/', async (_req, res) => {
  // Ativos primeiro, depois em ordem alfabética
  const usuarios = await consultar<UsuarioCadastro>(
    pool,
    `SELECT ${COLUNAS} FROM usuarios ORDER BY ativo DESC, unaccent(lower(nome))`,
  );
  res.json(usuarios);
});

rotasUsuarios.post('/', async (req, res) => {
  const { senha: senhaNova, ...dados } = criarSchema.parse(req.body);

  const criado = await emTransacao(async (executor) => {
    await garantirUnico(executor, 'usuarios', 'email', 'email', dados.email, 'este e-mail');
    return consultarUm<UsuarioCadastro>(
      executor,
      `INSERT INTO usuarios (nome, email, perfil, senha_hash)
            VALUES ($1, $2, $3, $4)
         RETURNING ${COLUNAS}`,
      [dados.nome, dados.email, dados.perfil, await gerarHashSenha(senhaNova)],
    );
  });

  res.status(201).json(criado);
});

rotasUsuarios.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const { novaSenha, ...dados } = atualizarSchema.parse(req.body);
  const idLogado = logado(req).id;

  // Impede que o administrador perca o próprio acesso por engano
  if (id === idLogado && !dados.ativo) {
    throw new ErroApi('Você não pode inativar o seu próprio usuário.', 400, {
      ativo: ['Não é possível inativar a si mesmo.'],
    });
  }
  if (id === idLogado && dados.perfil !== 'ADMIN') {
    throw new ErroApi('Você não pode remover o seu próprio perfil de administrador.', 400, {
      perfil: ['Não é possível alterar o próprio perfil.'],
    });
  }

  const atualizado = await emTransacao(async (executor) => {
    const existe = await consultarUm(executor, 'SELECT 1 FROM usuarios WHERE id = $1', [id]);
    if (!existe) throw new ErroApi('Usuário não encontrado.', 404);

    await garantirUnico(executor, 'usuarios', 'email', 'email', dados.email, 'este e-mail', id);

    const linha = await consultarUm<UsuarioCadastro>(
      executor,
      `UPDATE usuarios
          SET nome = $1, email = $2, perfil = $3, ativo = $4,
              senha_hash = COALESCE($5, senha_hash),
              atualizado_em = NOW()
        WHERE id = $6
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.email, dados.perfil, dados.ativo, novaSenha ? await gerarHashSenha(novaSenha) : null, id],
    );

    // RN10: usuário inativado perde as sessões abertas na hora
    if (!dados.ativo) {
      await executor.query('DELETE FROM sessoes WHERE usuario_id = $1', [id]);
    }
    return linha;
  });

  res.json(atualizado);
});
