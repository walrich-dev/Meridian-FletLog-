// Regras do RF03 (alertas de manutenção preventiva), escritas como funções puras
// para serem testadas isoladamente (situacao.test.ts).
import type { Situacao, SituacaoCnh } from '../tipos.js';
import { adicionarDias, diasEntre } from './datas.js';

export type Antecedencia = { km: number; dias: number };

export type ResultadoSituacao = {
  /** null quando a manutenção não tem data nem km programados (ex.: corretiva sem prazo) */
  situacao: Situacao | null;
  /** Dias até a data programada; negativo = dias de atraso */
  diasRestantes: number | null;
  /** Km até o limite; negativo = km excedidos */
  kmRestantes: number | null;
};

/** Ordem de gravidade, usada para ordenar os alertas e escolher a pior situação. */
export const GRAVIDADE: Record<Situacao, number> = { VENCIDA: 0, PROXIMA: 1, EM_DIA: 2 };

/**
 * Situação de uma manutenção pendente. Não é gravada: muda com a passagem do
 * tempo e com a quilometragem do veículo, então é calculada a cada consulta.
 * - VENCIDA: passou da data programada ou o veículo atingiu o km limite
 * - PROXIMA: faltam até N dias ou N km (antecedência definida nas configurações)
 * - EM_DIA: ainda longe dos limites
 * Com data e km, vale o critério que vencer primeiro.
 */
export function calcularSituacao(
  programacao: { dataProgramada: Date | null; kmLimite: number | null },
  kmAtual: number,
  antecedencia: Antecedencia,
  dataHoje: Date,
): ResultadoSituacao {
  const diasRestantes = programacao.dataProgramada ? diasEntre(dataHoje, programacao.dataProgramada) : null;
  const kmRestantes = programacao.kmLimite === null ? null : programacao.kmLimite - kmAtual;

  if (diasRestantes === null && kmRestantes === null) {
    return { situacao: null, diasRestantes, kmRestantes };
  }

  const vencida = (diasRestantes !== null && diasRestantes < 0) || (kmRestantes !== null && kmRestantes <= 0);
  const proxima =
    (diasRestantes !== null && diasRestantes <= antecedencia.dias) ||
    (kmRestantes !== null && kmRestantes <= antecedencia.km);

  return { situacao: vencida ? 'VENCIDA' : proxima ? 'PROXIMA' : 'EM_DIA', diasRestantes, kmRestantes };
}

/** A situação mais grave de uma lista (ex.: de todas as manutenções pendentes de um veículo). */
export function piorSituacao(situacoes: (Situacao | null)[]): Situacao | null {
  return situacoes.reduce<Situacao | null>(
    (pior, atual) => (atual !== null && (pior === null || GRAVIDADE[atual] < GRAVIDADE[pior]) ? atual : pior),
    null,
  );
}

/**
 * Programação da próxima preventiva recorrente, a partir de quando a atual foi feita.
 * Ex.: troca de óleo a cada 10.000 km ou 180 dias, feita aos 40.000 km em 01/03
 * -> próxima aos 50.000 km ou em 28/08, o que vier primeiro.
 * Retorna null se a manutenção não tiver intervalos.
 */
export function proximaProgramacao(
  intervalos: { intervaloKm: number | null; intervaloDias: number | null },
  realizacao: { data: Date; km: number },
): { dataProgramada: Date | null; kmLimite: number | null } | null {
  if (intervalos.intervaloKm === null && intervalos.intervaloDias === null) return null;

  return {
    kmLimite: intervalos.intervaloKm === null ? null : realizacao.km + intervalos.intervaloKm,
    dataProgramada: intervalos.intervaloDias === null ? null : adicionarDias(realizacao.data, intervalos.intervaloDias),
  };
}

/**
 * Situação da CNH: VENCIDA (a validade já passou), VENCENDO (vence em até N dias,
 * mesma antecedência dos alertas por data) ou VALIDA.
 */
export function calcularSituacaoCnh(validadeCnh: Date, antecedenciaDias: number, dataHoje: Date) {
  const diasParaVencer = diasEntre(dataHoje, validadeCnh);
  const situacaoCnh: SituacaoCnh =
    diasParaVencer < 0 ? 'VENCIDA' : diasParaVencer <= antecedenciaDias ? 'VENCENDO' : 'VALIDA';
  return { situacaoCnh, diasParaVencer };
}
