// RF03: manutenções pendentes vencidas ou próximas do limite (por data ou km) e
// CNHs vencidas ou perto de vencer. Veículos inativos não geram alertas.
import type { AlertaCnh, Alertas } from '../../lib/tipos';
import type { Banco } from '../banco';
import { adicionarDias } from '../regras/datas';
import { calcularSituacaoCnh, GRAVIDADE } from '../regras/situacao';
import { contextoAlertas } from './comum';
import { formatar as formatarManutencao } from './manutencoes';

export function listar(banco: Banco): Alertas {
  const contexto = contextoAlertas(banco);
  const veiculosAtivos = new Set(banco.veiculos.filter((v) => v.status !== 'INATIVO').map((v) => v.id));

  const manutencoes = banco.manutencoes
    .filter(
      (m) =>
        m.status === 'PENDENTE' &&
        veiculosAtivos.has(m.veiculoId) &&
        (m.dataProgramada !== null || m.kmLimite !== null),
    )
    .map((m) => formatarManutencao(banco, m, contexto))
    .filter((m) => m.situacao === 'VENCIDA' || m.situacao === 'PROXIMA')
    .sort(
      (a, b) =>
        GRAVIDADE[a.situacao ?? 'EM_DIA'] - GRAVIDADE[b.situacao ?? 'EM_DIA'] ||
        (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity) ||
        (a.kmRestantes ?? Infinity) - (b.kmRestantes ?? Infinity),
    );

  const limiteCnh = adicionarDias(contexto.hoje, contexto.antecedencia.dias);
  const cnh: AlertaCnh[] = banco.motoristas
    .filter((m) => m.ativo && new Date(m.validadeCnh) <= limiteCnh)
    .sort((a, b) => a.validadeCnh.localeCompare(b.validadeCnh))
    .map((motorista) => {
      const veiculo = banco.veiculos.find((v) => v.motoristaId === motorista.id);
      return {
        id: motorista.id,
        nome: motorista.nome,
        categoriaCnh: motorista.categoriaCnh,
        validadeCnh: motorista.validadeCnh,
        veiculo: veiculo ? { id: veiculo.id, placa: veiculo.placa } : null,
        ...calcularSituacaoCnh(new Date(motorista.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
      };
    });

  return {
    manutencoes,
    cnh,
    resumo: {
      manutencoesVencidas: manutencoes.filter((m) => m.situacao === 'VENCIDA').length,
      manutencoesProximas: manutencoes.filter((m) => m.situacao === 'PROXIMA').length,
      cnhVencidas: cnh.filter((m) => m.situacaoCnh === 'VENCIDA').length,
      cnhVencendo: cnh.filter((m) => m.situacaoCnh === 'VENCENDO').length,
      total: manutencoes.length + cnh.length,
    },
  };
}
