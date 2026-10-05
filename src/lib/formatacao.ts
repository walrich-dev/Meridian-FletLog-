// Funções de exibição (padrão brasileiro) e rótulos dos valores da API.
import type { Perfil, Situacao, SituacaoCnh, StatusManutencao, StatusVeiculo, TipoManutencao } from './tipos';

const numero = new Intl.NumberFormat('pt-BR');
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** "2026-10-17T00:00:00.000Z" -> "17/10/2026". As datas da API não têm fuso, então não se converte. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Valor para <input type="date">: "2026-10-17" */
export const dataParaInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

/** Data de hoje no computador do usuário, no formato do <input type="date"> */
export function hojeParaInput(): string {
  const agora = new Date();
  const ajustada = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return ajustada.toISOString().slice(0, 10);
}

export const formatarNumero = (valor: number) => numero.format(valor);
export const formatarKm = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : `${numero.format(valor)} km`;
export const formatarMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : moeda.format(valor);
export const formatarMoedaCompacta = (valor: number) => moedaCompacta.format(valor);

/** "2026-10" -> "out/26" (ou "out", sem o ano) */
export function formatarMes(anoMes: string, comAno = true): string {
  const [ano, mes] = anoMes.split('-').map(Number);
  const nome = new Date(Date.UTC(ano, mes - 1, 1))
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
  return comAno ? `${nome}/${String(ano).slice(2)}` : nome;
}

/** Placa para exibição: padrão antigo com hífen (ABC-1234); Mercosul sem (ABC1D23). */
export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

export function formatarCpf(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatarTelefone(telefone: string | null): string {
  if (!telefone) return '—';
  return telefone.length === 11
    ? telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    : telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

/** Texto sobre o prazo de uma manutenção pendente: "faltam 7 dias", "excedeu 2.400 km"... */
export function descreverPrazo(diasRestantes: number | null, kmRestantes: number | null): string {
  const partes: string[] = [];
  if (diasRestantes !== null) {
    if (diasRestantes < 0) partes.push(`atrasada ${plural(-diasRestantes, 'dia', 'dias')}`);
    else if (diasRestantes === 0) partes.push('vence hoje');
    else partes.push(`faltam ${plural(diasRestantes, 'dia', 'dias')}`);
  }
  if (kmRestantes !== null) {
    if (kmRestantes <= 0) partes.push(`excedeu ${formatarKm(-kmRestantes)}`);
    else partes.push(`faltam ${formatarKm(kmRestantes)}`);
  }
  return partes.join(' · ');
}

export function descreverValidadeCnh(diasParaVencer: number): string {
  if (diasParaVencer < 0) return `vencida há ${plural(-diasParaVencer, 'dia', 'dias')}`;
  if (diasParaVencer === 0) return 'vence hoje';
  return `vence em ${plural(diasParaVencer, 'dia', 'dias')}`;
}

export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${numero.format(quantidade)} ${quantidade === 1 ? singular : pluralTexto}`;
}

// -----------------------------------------------------------------------------
// Rótulos dos valores da API
// -----------------------------------------------------------------------------

export const ROTULO_STATUS_VEICULO: Record<StatusVeiculo, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo',
};

export const ROTULO_TIPO: Record<TipoManutencao, string> = {
  PREVENTIVA: 'Preventiva',
  CORRETIVA: 'Corretiva',
};

export const ROTULO_STATUS_MANUTENCAO: Record<StatusManutencao, string> = {
  PENDENTE: 'Pendente',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  VENCIDA: 'Vencida',
  PROXIMA: 'Próxima do limite',
  EM_DIA: 'Em dia',
};

export const ROTULO_SITUACAO_CNH: Record<SituacaoCnh, string> = {
  VENCIDA: 'CNH vencida',
  VENCENDO: 'CNH vencendo',
  VALIDA: 'CNH válida',
};

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor de frota',
};
