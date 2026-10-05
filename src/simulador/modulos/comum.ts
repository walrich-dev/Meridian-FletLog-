import type { Banco } from '../banco';
import { erroDeCampo } from '../erros';
import { hoje } from '../regras/datas';
import { normalizarBusca } from '../regras/documentos';
import type { Antecedencia } from '../regras/situacao';

export type ContextoAlertas = { antecedencia: Antecedencia; hoje: Date };

/** Dados necessários para calcular a situação das manutenções e das CNHs. */
export function contextoAlertas(banco: Banco): ContextoAlertas {
  const { alertaAntecedenciaKm, alertaAntecedenciaDias } = banco.configuracao;
  return { antecedencia: { km: alertaAntecedenciaKm, dias: alertaAntecedenciaDias }, hoje: hoje() };
}

export const paraData = (iso: string | null): Date | null => (iso === null ? null : new Date(iso));
export const paraIso = (data: Date | null): string | null => (data === null ? null : data.toISOString());
export const agora = () => new Date().toISOString();

/** Busca sem diferenciar maiúsculas nem acentos. */
export function contem(texto: string | null, busca: string): boolean {
  return texto !== null && normalizarBusca(texto).includes(normalizarBusca(busca));
}

/** Compara textos em ordem alfabética, como o português. */
export const ordemAlfabetica = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

/**
 * Impede duplicidade (o UNIQUE de um banco relacional): se outro registro já usa
 * o valor, responde 409 com o erro no campo do formulário.
 */
export function garantirUnico<T extends { id: number }>(
  registros: T[],
  campo: keyof T & string,
  valor: unknown,
  rotulo: string,
  idAtual?: number,
) {
  if (registros.some((registro) => registro[campo] === valor && registro.id !== idAtual)) {
    throw erroDeCampo(campo, `Já existe um cadastro com ${rotulo}.`, 409);
  }
}
