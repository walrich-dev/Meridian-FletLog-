// RNF01: login, sessão e troca de senha.
import { z } from 'zod';
import type { Usuario } from '../../lib/tipos';
import type { Banco, UsuarioRegistro } from '../banco';
import { ErroApi } from '../erros';
import { aleatorio, gerarHashSenha, senhaConfere } from '../regras/sha256';
import { email, senha } from '../regras/validacao';

/** Validade do login: depois disso, é preciso entrar de novo. */
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

const loginSchema = z.object({
  email,
  // No login não se aplica a regra de tamanho mínimo: só se compara com a senha cadastrada
  senha: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

const trocarSenhaSchema = z.object({
  senhaAtual: z.string({ error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.'),
  novaSenha: senha,
});

export const dadosPublicos = ({ id, nome, email, perfil }: UsuarioRegistro): Usuario => ({ id, nome, email, perfil });

export function entrar(banco: Banco, corpo: unknown) {
  const dados = loginSchema.parse(corpo);
  const usuario = banco.usuarios.find((u) => u.email === dados.email);

  // Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem
  if (!usuario || !senhaConfere(dados.senha, usuario.senhaHash)) {
    throw new ErroApi('E-mail ou senha incorretos.', 401);
  }
  if (!usuario.ativo) {
    throw new ErroApi('Usuário inativo. Procure o administrador do sistema.', 403);
  }

  const momento = Date.now();
  const token = aleatorio(32);
  banco.sessoes = banco.sessoes.filter((sessao) => Date.parse(sessao.expiraEm) > momento);
  banco.sessoes.push({ token, usuarioId: usuario.id, expiraEm: new Date(momento + DURACAO_SESSAO_MS).toISOString() });

  return { token, usuario: dadosPublicos(usuario) };
}

/** Confere o token de cada requisição. O usuário precisa continuar ativo. */
export function autenticar(banco: Banco, token: string | null): Usuario {
  if (!token) throw new ErroApi('Faça login para continuar.', 401);

  const sessao = banco.sessoes.find((s) => s.token === token);
  if (!sessao) throw new ErroApi('Sessão inválida. Entre novamente.', 401);
  if (Date.parse(sessao.expiraEm) <= Date.now()) throw new ErroApi('Sua sessão expirou. Entre novamente.', 401);

  const usuario = banco.usuarios.find((u) => u.id === sessao.usuarioId);
  if (!usuario?.ativo) throw new ErroApi('Sessão inválida. Entre novamente.', 401);
  return dadosPublicos(usuario);
}

export function sair(banco: Banco, token: string | null) {
  banco.sessoes = banco.sessoes.filter((sessao) => sessao.token !== token);
}

export function trocarSenha(banco: Banco, usuarioId: number, corpo: unknown) {
  const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(corpo);
  const usuario = banco.usuarios.find((u) => u.id === usuarioId);
  if (!usuario) throw new ErroApi('Usuário não encontrado.', 404);

  if (!senhaConfere(senhaAtual, usuario.senhaHash)) {
    throw new ErroApi('A senha atual está incorreta.', 400, { senhaAtual: ['A senha atual está incorreta.'] });
  }
  usuario.senhaHash = gerarHashSenha(novaSenha);
  usuario.atualizadoEm = new Date().toISOString();
}
