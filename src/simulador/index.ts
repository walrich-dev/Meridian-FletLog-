// API simulada: atende no próprio navegador as mesmas rotas que a API real do
// Meridian teria (ver README), com as mesmas regras de negócio, validações e
// formatos de resposta. Os dados ficam no localStorage. Para usar uma API real,
// basta definir VITE_API_URL: o painel passa a fazer requisições HTTP e este
// módulo nem é carregado.
import { z, ZodError } from 'zod';
import type { Perfil, Usuario } from '../lib/tipos';
import {
  armazenamentoDoNavegador,
  CHAVE_ARMAZENAMENTO,
  gravarBanco,
  lerBanco,
  type Armazenamento,
  type Banco,
} from './banco';
import { criarDadosIniciais } from './dados-iniciais';
import { ErroApi } from './erros';
import { lerId } from './regras/validacao';
import * as alertas from './modulos/alertas';
import * as auth from './modulos/auth';
import * as configuracoes from './modulos/configuracoes';
import * as dashboard from './modulos/dashboard';
import * as manutencoes from './modulos/manutencoes';
import * as motoristas from './modulos/motoristas';
import * as usuarios from './modulos/usuarios';
import * as veiculos from './modulos/veiculos';

export type RespostaSimulada = { status: number; corpo: unknown };

type Contexto = {
  banco: Banco;
  corpo: unknown;
  consulta: Record<string, string>;
  params: Record<string, string>;
  usuario: Usuario | null;
  token: string | null;
};

type Rota = {
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Ex.: "/veiculos/:id" */
  caminho: string;
  /** Rotas públicas não exigem login (RNF01) */
  publica?: boolean;
  /** Perfis autorizados; ausente = qualquer usuário logado */
  perfis?: Perfil[];
  /** Altera dados: roda numa cópia do banco, gravada só se der certo (como uma transação) */
  altera?: boolean;
  /** Status de sucesso (padrão 200; sem retorno, 204) */
  status?: number;
  executar: (contexto: Contexto) => unknown;
};

/** Usuário logado (as rotas não públicas sempre têm um). */
function logado({ usuario }: Contexto): Usuario {
  if (!usuario) throw new ErroApi('Faça login para continuar.', 401);
  return usuario;
}

const ROTAS: Rota[] = [
  // Situação da API
  {
    metodo: 'GET',
    caminho: '/health',
    publica: true,
    executar: () => ({ status: 'ok', banco: 'conectado', horario: new Date().toISOString() }),
  },

  // Autenticação (RNF01)
  { metodo: 'POST', caminho: '/auth/login', publica: true, altera: true, executar: (c) => auth.entrar(c.banco, c.corpo) },
  { metodo: 'POST', caminho: '/auth/logout', altera: true, executar: (c) => auth.sair(c.banco, c.token) },
  { metodo: 'GET', caminho: '/auth/me', executar: (c) => logado(c) },
  { metodo: 'PUT', caminho: '/auth/senha', altera: true, executar: (c) => auth.trocarSenha(c.banco, logado(c).id, c.corpo) },

  // Usuários (somente ADMIN)
  { metodo: 'GET', caminho: '/usuarios', perfis: ['ADMIN'], executar: (c) => usuarios.listar(c.banco) },
  { metodo: 'POST', caminho: '/usuarios', perfis: ['ADMIN'], altera: true, status: 201, executar: (c) => usuarios.criar(c.banco, c.corpo) },
  {
    metodo: 'PUT',
    caminho: '/usuarios/:id',
    perfis: ['ADMIN'],
    altera: true,
    executar: (c) => usuarios.atualizar(c.banco, lerId(c.params.id), c.corpo, logado(c).id),
  },

  // Veículos (RF01)
  { metodo: 'GET', caminho: '/veiculos', executar: (c) => veiculos.listar(c.banco, c.consulta) },
  { metodo: 'GET', caminho: '/veiculos/:id', executar: (c) => veiculos.obter(c.banco, lerId(c.params.id)) },
  { metodo: 'POST', caminho: '/veiculos', altera: true, status: 201, executar: (c) => veiculos.criar(c.banco, c.corpo) },
  { metodo: 'PUT', caminho: '/veiculos/:id', altera: true, executar: (c) => veiculos.atualizar(c.banco, lerId(c.params.id), c.corpo) },
  { metodo: 'PATCH', caminho: '/veiculos/:id/km', altera: true, executar: (c) => veiculos.atualizarKm(c.banco, lerId(c.params.id), c.corpo) },
  { metodo: 'DELETE', caminho: '/veiculos/:id', altera: true, executar: (c) => veiculos.inativar(c.banco, lerId(c.params.id)) },
  { metodo: 'POST', caminho: '/veiculos/:id/reativar', altera: true, executar: (c) => veiculos.reativar(c.banco, lerId(c.params.id)) },

  // Motoristas (RF01)
  { metodo: 'GET', caminho: '/motoristas', executar: (c) => motoristas.listar(c.banco, c.consulta) },
  { metodo: 'GET', caminho: '/motoristas/:id', executar: (c) => motoristas.obter(c.banco, lerId(c.params.id)) },
  { metodo: 'POST', caminho: '/motoristas', altera: true, status: 201, executar: (c) => motoristas.criar(c.banco, c.corpo) },
  { metodo: 'PUT', caminho: '/motoristas/:id', altera: true, executar: (c) => motoristas.atualizar(c.banco, lerId(c.params.id), c.corpo) },
  { metodo: 'DELETE', caminho: '/motoristas/:id', altera: true, executar: (c) => motoristas.inativar(c.banco, lerId(c.params.id)) },
  { metodo: 'POST', caminho: '/motoristas/:id/reativar', altera: true, executar: (c) => motoristas.reativar(c.banco, lerId(c.params.id)) },

  // Manutenções (RF03)
  { metodo: 'GET', caminho: '/manutencoes', executar: (c) => manutencoes.listar(c.banco, c.consulta) },
  { metodo: 'GET', caminho: '/manutencoes/:id', executar: (c) => manutencoes.obter(c.banco, lerId(c.params.id)) },
  { metodo: 'POST', caminho: '/manutencoes', altera: true, status: 201, executar: (c) => manutencoes.criar(c.banco, c.corpo) },
  { metodo: 'PUT', caminho: '/manutencoes/:id', altera: true, executar: (c) => manutencoes.atualizar(c.banco, lerId(c.params.id), c.corpo) },
  {
    metodo: 'POST',
    caminho: '/manutencoes/:id/concluir',
    altera: true,
    executar: (c) => manutencoes.concluir(c.banco, lerId(c.params.id), c.corpo),
  },
  { metodo: 'POST', caminho: '/manutencoes/:id/cancelar', altera: true, executar: (c) => manutencoes.cancelar(c.banco, lerId(c.params.id)) },
  { metodo: 'DELETE', caminho: '/manutencoes/:id', altera: true, executar: (c) => manutencoes.excluir(c.banco, lerId(c.params.id)) },

  // Alertas (RF03), dashboard (RF02) e configurações
  { metodo: 'GET', caminho: '/alertas', executar: (c) => alertas.listar(c.banco) },
  { metodo: 'GET', caminho: '/dashboard', executar: (c) => dashboard.resumo(c.banco) },
  { metodo: 'GET', caminho: '/configuracoes', executar: (c) => configuracoes.obter(c.banco) },
  { metodo: 'PUT', caminho: '/configuracoes', perfis: ['ADMIN'], altera: true, executar: (c) => configuracoes.atualizar(c.banco, c.corpo) },

  // Exclusiva da simulação: apaga as alterações e recria os dados de demonstração
  {
    metodo: 'POST',
    caminho: '/demonstracao/restaurar',
    perfis: ['ADMIN'],
    altera: true,
    executar: ({ banco }) => {
      // As sessões abertas continuam valendo, para ninguém ser deslogado
      Object.assign(banco, { ...criarDadosIniciais(), sessoes: banco.sessoes });
    },
  },
];

function encontrarRota(metodo: string, caminho: string) {
  const partes = caminho.split('/').filter(Boolean);
  for (const rota of ROTAS) {
    if (rota.metodo !== metodo) continue;
    const partesRota = rota.caminho.split('/').filter(Boolean);
    if (partesRota.length !== partes.length) continue;

    const params: Record<string, string> = {};
    const confere = partesRota.every((parte, i) => {
      if (parte.startsWith(':')) {
        params[parte.slice(1)] = decodeURIComponent(partes[i]);
        return true;
      }
      return parte === partes[i];
    });
    if (confere) return { rota, params };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Estado
// -----------------------------------------------------------------------------

let armazenamento: Armazenamento = armazenamentoDoNavegador;
let bancoAtual: Banco | null = null;

function obterBanco(): Banco {
  if (!bancoAtual) {
    bancoAtual = lerBanco(armazenamento) ?? criarDadosIniciais();
    gravarBanco(armazenamento, bancoAtual);
  }
  return bancoAtual;
}

/** Troca onde os dados ficam guardados (os testes usam memória). */
export function configurarArmazenamento(novo: Armazenamento) {
  armazenamento = novo;
  bancoAtual = null;
}

// Outra aba alterou os dados: relê na próxima requisição
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (evento) => {
    if (evento.key === CHAVE_ARMAZENAMENTO) bancoAtual = null;
  });
}

// -----------------------------------------------------------------------------
// Atendimento das requisições
// -----------------------------------------------------------------------------

/** Atende uma requisição como a API real atenderia: status + corpo JSON. */
export function requisicaoSimulada(
  metodo: string,
  caminhoCompleto: string,
  corpo: unknown,
  token: string | null,
): RespostaSimulada {
  const url = new URL(caminhoCompleto, 'http://simulador.local');
  const encontrada = encontrarRota(metodo.toUpperCase(), url.pathname);
  if (!encontrada) {
    return { status: 404, corpo: { mensagem: `Rota não encontrada: ${metodo} ${url.pathname}` } };
  }
  const { rota, params } = encontrada;

  try {
    const banco = obterBanco();
    const usuario = rota.publica ? null : auth.autenticar(banco, token);
    if (rota.perfis && (!usuario || !rota.perfis.includes(usuario.perfil))) {
      throw new ErroApi('Você não tem permissão para realizar esta ação.', 403);
    }

    const alvo = rota.altera ? structuredClone(banco) : banco;
    const resultado = rota.executar({
      banco: alvo,
      corpo,
      consulta: Object.fromEntries(url.searchParams),
      params,
      usuario,
      token,
    });
    if (rota.altera) {
      bancoAtual = alvo;
      gravarBanco(armazenamento, alvo);
    }

    if (resultado === undefined) return { status: 204, corpo: null };
    // Cópia em JSON: a tela recebe exatamente o que receberia de uma API HTTP
    return { status: rota.status ?? 200, corpo: JSON.parse(JSON.stringify(resultado)) };
  } catch (erro) {
    if (erro instanceof ErroApi) {
      return { status: erro.status, corpo: { mensagem: erro.message, detalhes: erro.detalhes } };
    }
    if (erro instanceof ZodError) {
      return { status: 400, corpo: { mensagem: 'Dados inválidos.', detalhes: z.flattenError(erro).fieldErrors } };
    }
    console.error('[API simulada]', erro);
    return { status: 500, corpo: { mensagem: 'Erro interno do servidor.' } };
  }
}
