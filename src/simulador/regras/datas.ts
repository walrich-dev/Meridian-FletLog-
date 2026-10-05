// Datas sem horário (validade da CNH, data programada...) são guardadas como
// "AAAA-MM-DDT00:00:00.000Z", o mesmo formato que uma API com PostgreSQL devolve.
// O "hoje" é calculado no fuso da empresa, e não no do computador.
export const FUSO_HORARIO = 'America/Sao_Paulo';

const MS_POR_DIA = 86_400_000;

// 'en-CA' formata a data como AAAA-MM-DD
const formatoIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_HORARIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Converte "2026-10-17" em Date (meia-noite UTC). */
export function dataDeTexto(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

/** Converte uma data em "2026-10-17". */
export function textoDeData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Data de hoje no fuso da empresa. */
export function hoje(agora = new Date()): Date {
  return dataDeTexto(formatoIso.format(agora));
}

export function adicionarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * MS_POR_DIA);
}

/** Dias de `inicio` até `fim`: positivo se `fim` é futuro, negativo se já passou. */
export function diasEntre(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}

/** Primeiro dia do mês de `data`, deslocado em `meses` (ex.: -11 = onze meses antes). */
export function inicioDoMes(data: Date, meses = 0): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + meses, 1));
}
