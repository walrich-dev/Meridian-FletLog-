import {
  ROTULO_SITUACAO,
  ROTULO_SITUACAO_CNH,
  ROTULO_STATUS_MANUTENCAO,
  ROTULO_STATUS_VEICULO,
  ROTULO_TIPO,
} from '../lib/formatacao';
import type { Situacao, SituacaoCnh, StatusManutencao, StatusVeiculo, TipoManutencao } from '../lib/tipos';
import { Badge, type Tom } from './ui/Badge';

// Cores dos status em todo o painel: vermelho = exige ação, amarelo = atenção, verde = ok.
// O azul da marca fica para identidade (ex.: tipo preventiva), nunca para status.

const TOM_SITUACAO: Record<Situacao, Tom> = { VENCIDA: 'vermelho', PROXIMA: 'amarelo', EM_DIA: 'verde' };
const TOM_CNH: Record<SituacaoCnh, Tom> = { VENCIDA: 'vermelho', VENCENDO: 'amarelo', VALIDA: 'verde' };
const TOM_VEICULO: Record<StatusVeiculo, Tom> = { ATIVO: 'verde', EM_MANUTENCAO: 'amarelo', INATIVO: 'cinza' };
const TOM_MANUTENCAO: Record<StatusManutencao, Tom> = { PENDENTE: 'azul', REALIZADA: 'verde', CANCELADA: 'cinza' };

export const BadgeSituacao = ({ situacao }: { situacao: Situacao }) => (
  <Badge tom={TOM_SITUACAO[situacao]} ponto>
    {ROTULO_SITUACAO[situacao]}
  </Badge>
);

export const BadgeCnh = ({ situacao }: { situacao: SituacaoCnh }) => (
  <Badge tom={TOM_CNH[situacao]} ponto>
    {ROTULO_SITUACAO_CNH[situacao]}
  </Badge>
);

export const BadgeStatusVeiculo = ({ status }: { status: StatusVeiculo }) => (
  <Badge tom={TOM_VEICULO[status]} ponto>
    {ROTULO_STATUS_VEICULO[status]}
  </Badge>
);

export const BadgeStatusManutencao = ({ status }: { status: StatusManutencao }) => (
  <Badge tom={TOM_MANUTENCAO[status]} ponto>
    {ROTULO_STATUS_MANUTENCAO[status]}
  </Badge>
);

export const BadgeTipo = ({ tipo }: { tipo: TipoManutencao }) => (
  <Badge tom={tipo === 'PREVENTIVA' ? 'marca' : 'cinza'}>{ROTULO_TIPO[tipo]}</Badge>
);
