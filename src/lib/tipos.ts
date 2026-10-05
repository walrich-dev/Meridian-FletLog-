// Formato dos dados trocados com a API (real ou simulada). Datas chegam como texto
// ISO (ex.: "2026-10-17T00:00:00.000Z"); use as funções de lib/formatacao.ts para exibi-las.

export type Perfil = 'ADMIN' | 'GESTOR';
export type StatusVeiculo = 'ATIVO' | 'EM_MANUTENCAO' | 'INATIVO';
export type CategoriaCnh = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
export type TipoManutencao = 'PREVENTIVA' | 'CORRETIVA';
export type StatusManutencao = 'PENDENTE' | 'REALIZADA' | 'CANCELADA';
/** Situação calculada das manutenções pendentes (RF03) */
export type Situacao = 'VENCIDA' | 'PROXIMA' | 'EM_DIA';
export type SituacaoCnh = 'VENCIDA' | 'VENCENDO' | 'VALIDA';

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
};

export type UsuarioCadastro = Usuario & { ativo: boolean; criadoEm: string };

export type RespostaLogin = { token: string; usuario: Usuario };

export type Veiculo = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  chassi: string;
  renavam: string;
  anoAquisicao: number;
  kmAtual: number;
  status: StatusVeiculo;
  motoristaId: number | null;
  motorista: { id: number; nome: string } | null;
};

export type VeiculoListagem = Veiculo & {
  manutencoesPendentes: number;
  /** A situação mais grave entre as manutenções pendentes do veículo */
  situacaoManutencao: Situacao | null;
};

export type VeiculoDetalhe = Omit<Veiculo, 'motorista'> & {
  motorista: {
    id: number;
    nome: string;
    telefone: string | null;
    validadeCnh: string;
    situacaoCnh: SituacaoCnh;
    diasParaVencer: number;
  } | null;
  custoTotal: number;
  manutencoesRealizadas: number;
};

export type Motorista = {
  id: number;
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCnh: CategoriaCnh;
  validadeCnh: string;
  telefone: string | null;
  ativo: boolean;
  veiculo: { id: number; placa: string; modelo: string } | null;
  situacaoCnh: SituacaoCnh;
  diasParaVencer: number;
};

export type Manutencao = {
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
  veiculo: { id: number; placa: string; marca: string; modelo: string; kmAtual: number; status: StatusVeiculo };
  situacao: Situacao | null;
  /** Dias até a data programada (negativo = atraso) */
  diasRestantes: number | null;
  /** Km até o limite (negativo = excedidos) */
  kmRestantes: number | null;
};

export type ResultadoManutencao = { manutencao: Manutencao; proxima: Manutencao | null };

export type AlertaCnh = {
  id: number;
  nome: string;
  categoriaCnh: CategoriaCnh;
  validadeCnh: string;
  veiculo: { id: number; placa: string } | null;
  situacaoCnh: SituacaoCnh;
  diasParaVencer: number;
};

export type Alertas = {
  manutencoes: Manutencao[];
  cnh: AlertaCnh[];
  resumo: {
    manutencoesVencidas: number;
    manutencoesProximas: number;
    cnhVencidas: number;
    cnhVencendo: number;
    total: number;
  };
};

export type Dashboard = {
  frota: { veiculos: number; ativos: number; emManutencao: number; semMotorista: number; motoristasAtivos: number };
  quilometragem: {
    total: number;
    media: number;
    porVeiculo: { id: number; placa: string; modelo: string; kmAtual: number }[];
  };
  custos: {
    mesAtual: number;
    mesAnterior: number;
    ultimos12Meses: number;
    porMes: { mes: string; total: number }[];
    porTipo: Record<TipoManutencao, number>;
    porVeiculo: { id: number; placa: string; modelo: string; total: number }[];
  };
  manutencoes: { pendentes: number; vencidas: number; proximas: number; realizadasNoMes: number };
};

export type Configuracao = {
  alertaAntecedenciaKm: number;
  alertaAntecedenciaDias: number;
  atualizadoEm: string;
};
