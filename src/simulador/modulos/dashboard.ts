// RF02: indicadores de frota, quilometragem, custos e manutenções.
import type { Dashboard } from '../../lib/tipos';
import type { Banco } from '../banco';
import { inicioDoMes, textoDeData } from '../regras/datas';
import { calcularSituacao } from '../regras/situacao';
import { contextoAlertas, paraData } from './comum';

/** Período do gráfico de custos: o mês atual e os 11 anteriores. */
const MESES_DO_GRAFICO = 12;

/** Soma em centavos para evitar erros de arredondamento de ponto flutuante. */
const emCentavos = (valor: number | null) => Math.round((valor ?? 0) * 100);

/**
 * Os custos incluem veículos já inativos, para que o histórico não mude quando
 * um veículo é excluído.
 */
export function resumo(banco: Banco): Dashboard {
  const contexto = contextoAlertas(banco);
  const inicioMesAtual = inicioDoMes(contexto.hoje).toISOString();
  const inicioPeriodo = inicioDoMes(contexto.hoje, -(MESES_DO_GRAFICO - 1));

  const veiculos = banco.veiculos.filter((v) => v.status !== 'INATIVO').sort((a, b) => b.kmAtual - a.kmAtual);
  const ativos = new Set(veiculos.map((v) => v.id));

  // Quilometragem
  const kmTotal = veiculos.reduce((soma, veiculo) => soma + veiculo.kmAtual, 0);

  // Custos por mês, por tipo e por veículo (em centavos até o fim)
  const meses = Array.from({ length: MESES_DO_GRAFICO }, (_, i) => textoDeData(inicioDoMes(inicioPeriodo, i)).slice(0, 7));
  const porMes = new Map(meses.map((mes) => [mes, 0]));
  const porTipo = { PREVENTIVA: 0, CORRETIVA: 0 };
  const porVeiculo = new Map<number, { id: number; placa: string; modelo: string; total: number }>();
  let realizadasNoMes = 0;

  const realizadas = banco.manutencoes.filter(
    (m) => m.status === 'REALIZADA' && m.dataRealizacao !== null && m.dataRealizacao >= inicioPeriodo.toISOString(),
  );
  for (const manutencao of realizadas) {
    const dataRealizacao = manutencao.dataRealizacao ?? '';
    const centavos = emCentavos(manutencao.custo);
    const mes = dataRealizacao.slice(0, 7);
    const veiculo = banco.veiculos.find((v) => v.id === manutencao.veiculoId);

    porMes.set(mes, (porMes.get(mes) ?? 0) + centavos);
    porTipo[manutencao.tipo] += centavos;
    if (veiculo) {
      const doVeiculo = porVeiculo.get(veiculo.id) ?? { id: veiculo.id, placa: veiculo.placa, modelo: veiculo.modelo, total: 0 };
      doVeiculo.total += centavos;
      porVeiculo.set(veiculo.id, doVeiculo);
    }
    if (dataRealizacao >= inicioMesAtual) realizadasNoMes++;
  }

  const custoPorMes = meses.map((mes) => ({ mes, total: (porMes.get(mes) ?? 0) / 100 }));
  const totalPeriodo = [...porMes.values()].reduce((soma, valor) => soma + valor, 0);

  // Situação das manutenções pendentes da frota ativa
  const situacoes = banco.manutencoes
    .filter((m) => m.status === 'PENDENTE' && ativos.has(m.veiculoId))
    .map((m) => {
      const kmAtual = veiculos.find((v) => v.id === m.veiculoId)?.kmAtual ?? 0;
      return calcularSituacao(
        { dataProgramada: paraData(m.dataProgramada), kmLimite: m.kmLimite },
        kmAtual,
        contexto.antecedencia,
        contexto.hoje,
      ).situacao;
    });

  return {
    frota: {
      veiculos: veiculos.length,
      ativos: veiculos.filter((v) => v.status === 'ATIVO').length,
      emManutencao: veiculos.filter((v) => v.status === 'EM_MANUTENCAO').length,
      semMotorista: veiculos.filter((v) => v.motoristaId === null).length,
      motoristasAtivos: banco.motoristas.filter((m) => m.ativo).length,
    },
    quilometragem: {
      total: kmTotal,
      media: veiculos.length ? Math.round(kmTotal / veiculos.length) : 0,
      porVeiculo: veiculos.map(({ id, placa, modelo, kmAtual }) => ({ id, placa, modelo, kmAtual })),
    },
    custos: {
      mesAtual: custoPorMes.at(-1)?.total ?? 0,
      mesAnterior: custoPorMes.at(-2)?.total ?? 0,
      ultimos12Meses: totalPeriodo / 100,
      porMes: custoPorMes,
      porTipo: { PREVENTIVA: porTipo.PREVENTIVA / 100, CORRETIVA: porTipo.CORRETIVA / 100 },
      porVeiculo: [...porVeiculo.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((veiculo) => ({ ...veiculo, total: veiculo.total / 100 })),
    },
    manutencoes: {
      pendentes: situacoes.length,
      vencidas: situacoes.filter((s) => s === 'VENCIDA').length,
      proximas: situacoes.filter((s) => s === 'PROXIMA').length,
      realizadasNoMes,
    },
  };
}
