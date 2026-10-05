// "Banco de dados" da API simulada: um objeto com uma lista por tabela, guardado
// no localStorage do navegador. As tabelas e colunas seguem o modelo de dados do
// projeto (usuarios, motoristas, veiculos, manutencoes, configuracoes).
import type { CategoriaCnh, Perfil, StatusManutencao, StatusVeiculo, TipoManutencao } from '../lib/tipos';

// Datas são guardadas como texto ISO ("2026-10-17T00:00:00.000Z"), como uma API devolveria.

export type UsuarioRegistro = {
  id: number;
  nome: string;
  email: string;
  /** "sal:sha256" — a senha em texto puro nunca é guardada */
  senhaHash: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type MotoristaRegistro = {
  id: number;
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCnh: CategoriaCnh;
  validadeCnh: string;
  telefone: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type VeiculoRegistro = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  chassi: string;
  renavam: string;
  anoAquisicao: number;
  kmAtual: number;
  status: StatusVeiculo;
  /** Motorista responsável (0..1); um motorista é responsável por no máximo um veículo */
  motoristaId: number | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ManutencaoRegistro = {
  id: number;
  veiculoId: number;
  tipo: TipoManutencao;
  descricao: string;
  status: StatusManutencao;
  dataProgramada: string | null;
  kmLimite: number | null;
  intervaloKm: number | null;
  intervaloDias: number | null;
  dataRealizacao: string | null;
  kmRealizacao: number | null;
  custo: number | null;
  oficina: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ConfiguracaoRegistro = {
  alertaAntecedenciaKm: number;
  alertaAntecedenciaDias: number;
  atualizadoEm: string;
};

export type Sessao = { token: string; usuarioId: number; expiraEm: string };

export type Tabela = 'usuarios' | 'motoristas' | 'veiculos' | 'manutencoes';

export type Banco = {
  /** Muda quando o formato dos dados muda; dados de versão antiga são recriados */
  versao: number;
  usuarios: UsuarioRegistro[];
  motoristas: MotoristaRegistro[];
  veiculos: VeiculoRegistro[];
  manutencoes: ManutencaoRegistro[];
  configuracao: ConfiguracaoRegistro;
  sessoes: Sessao[];
  /** Último id usado em cada tabela (como o SERIAL do PostgreSQL) */
  ultimoId: Record<Tabela, number>;
};

export const VERSAO_BANCO = 1;

/** Próximo id da tabela. Ids nunca são reaproveitados, mesmo após exclusões. */
export function novoId(banco: Banco, tabela: Tabela): number {
  banco.ultimoId[tabela] += 1;
  return banco.ultimoId[tabela];
}

export function bancoVazio(): Banco {
  return {
    versao: VERSAO_BANCO,
    usuarios: [],
    motoristas: [],
    veiculos: [],
    manutencoes: [],
    configuracao: { alertaAntecedenciaKm: 500, alertaAntecedenciaDias: 15, atualizadoEm: new Date().toISOString() },
    sessoes: [],
    ultimoId: { usuarios: 0, motoristas: 0, veiculos: 0, manutencoes: 0 },
  };
}

// -----------------------------------------------------------------------------
// Armazenamento
// -----------------------------------------------------------------------------

export type Armazenamento = { ler: () => string | null; gravar: (texto: string) => void };

export const CHAVE_ARMAZENAMENTO = 'meridian:banco-simulado';

/** localStorage do navegador. Em navegação privada ou com armazenamento bloqueado, os dados duram até recarregar. */
export const armazenamentoDoNavegador: Armazenamento = {
  ler: () => {
    try {
      return localStorage.getItem(CHAVE_ARMAZENAMENTO);
    } catch {
      return null;
    }
  },
  gravar: (texto) => {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, texto);
    } catch {
      // sem armazenamento disponível: os dados ficam só na memória
    }
  },
};

/** Armazenamento temporário, usado nos testes automatizados. */
export function armazenamentoEmMemoria(): Armazenamento {
  let texto: string | null = null;
  return {
    ler: () => texto,
    gravar: (novo) => {
      texto = novo;
    },
  };
}

export function lerBanco(armazenamento: Armazenamento): Banco | null {
  const texto = armazenamento.ler();
  if (!texto) return null;
  try {
    const banco = JSON.parse(texto) as Banco;
    return banco.versao === VERSAO_BANCO ? banco : null;
  } catch {
    return null; // dados corrompidos: recria os de demonstração
  }
}

export function gravarBanco(armazenamento: Armazenamento, banco: Banco) {
  armazenamento.gravar(JSON.stringify(banco));
}
