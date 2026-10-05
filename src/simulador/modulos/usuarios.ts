// Gestão de usuários (somente ADMIN).
import { z } from 'zod';
import type { UsuarioCadastro } from '../../lib/tipos';
import { novoId, type Banco, type UsuarioRegistro } from '../banco';
import { ErroApi } from '../erros';
import { gerarHashSenha } from '../regras/sha256';
import { email, opcional, senha, texto } from '../regras/validacao';
import { agora, garantirUnico, ordemAlfabetica } from './comum';

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
const formatar = ({ id, nome, email, perfil, ativo, criadoEm }: UsuarioRegistro): UsuarioCadastro => ({
  id,
  nome,
  email,
  perfil,
  ativo,
  criadoEm,
});

export function listar(banco: Banco) {
  return [...banco.usuarios]
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || ordemAlfabetica(a.nome, b.nome))
    .map(formatar);
}

export function criar(banco: Banco, corpo: unknown) {
  const { senha, ...dados } = criarSchema.parse(corpo);
  garantirUnico(banco.usuarios, 'email', dados.email, 'este e-mail');

  const registro: UsuarioRegistro = {
    id: novoId(banco, 'usuarios'),
    ...dados,
    senhaHash: gerarHashSenha(senha),
    ativo: true,
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  banco.usuarios.push(registro);
  return formatar(registro);
}

export function atualizar(banco: Banco, id: number, corpo: unknown, idUsuarioLogado: number) {
  const { novaSenha, ...dados } = atualizarSchema.parse(corpo);
  const usuario = banco.usuarios.find((u) => u.id === id);
  if (!usuario) throw new ErroApi('Usuário não encontrado.', 404);

  // Impede que o administrador perca o próprio acesso por engano
  if (id === idUsuarioLogado && !dados.ativo) {
    throw new ErroApi('Você não pode inativar o seu próprio usuário.', 400, { ativo: ['Não é possível inativar a si mesmo.'] });
  }
  if (id === idUsuarioLogado && dados.perfil !== 'ADMIN') {
    throw new ErroApi('Você não pode remover o seu próprio perfil de administrador.', 400, {
      perfil: ['Não é possível alterar o próprio perfil.'],
    });
  }
  garantirUnico(banco.usuarios, 'email', dados.email, 'este e-mail', id);

  Object.assign(usuario, dados, { atualizadoEm: agora() });
  if (novaSenha) usuario.senhaHash = gerarHashSenha(novaSenha);
  // Usuário inativado perde as sessões abertas na hora
  if (!usuario.ativo) banco.sessoes = banco.sessoes.filter((sessao) => sessao.usuarioId !== id);
  return formatar(usuario);
}
