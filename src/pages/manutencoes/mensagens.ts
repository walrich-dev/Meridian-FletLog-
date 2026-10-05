import { formatarData, formatarKm } from '../../lib/formatacao';
import type { ResultadoManutencao } from '../../lib/tipos';

/** Mensagem exibida ao concluir, avisando quando a próxima preventiva foi programada. */
export function mensagemConclusao({ proxima }: ResultadoManutencao, inicio = 'Manutenção concluída.'): string {
  if (!proxima) return inicio;
  const quando = [
    proxima.dataProgramada && `em ${formatarData(proxima.dataProgramada)}`,
    proxima.kmLimite !== null && `aos ${formatarKm(proxima.kmLimite)}`,
  ].filter(Boolean);
  return `${inicio} Próxima preventiva programada ${quando.join(' ou ')}.`;
}
