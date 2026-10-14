// RF02: indicadores de frota, quilometragem, custos e manutenções.
//
// As somas são feitas pelo PostgreSQL (SUM, COUNT, GROUP BY), que é o que um
// banco faz melhor. Só a situação das manutenções é calculada aqui, porque
// depende da data de hoje e do hodômetro (RF03).
import { Router } from 'express';
import { autenticar } from '../autenticacao.js';
import { consultar, consultarUm, dataParaColuna, pool } from '../banco.js';
import { contextoAlertas } from '../consultas.js';
import { dataDeTexto, inicioDoMes, textoDeData } from '../regras/datas.js';
import { calcularSituacao } from '../regras/situacao.js';
import type { Dashboard, Situacao } from '../tipos.js';

/** Período do gráfico de custos: o mês atual e os 11 anteriores. */
const MESES_DO_GRAFICO = 12;

export const rotasDashboard = Router();

rotasDashboard.use(autenticar);

rotasDashboard.get('/', async (_req, res) => {
  const contexto = await contextoAlertas(pool);
  const inicioPeriodo = inicioDoMes(contexto.hoje, -(MESES_DO_GRAFICO - 1));
  const inicioMesAtual = inicioDoMes(contexto.hoje);

  // ---------------------------------------------------------------------------
  // Frota: só veículos ativos ou em manutenção (os inativos não contam)
  // ---------------------------------------------------------------------------
  const frota = (await consultarUm<Dashboard['frota']>(
    pool,
    `SELECT COUNT(*)                                            AS veiculos,
            COUNT(*) FILTER (WHERE status = 'ATIVO')            AS ativos,
            COUNT(*) FILTER (WHERE status = 'EM_MANUTENCAO')    AS "emManutencao",
            COUNT(*) FILTER (WHERE motorista_id IS NULL)        AS "semMotorista",
            (SELECT COUNT(*) FROM motoristas WHERE ativo)       AS "motoristasAtivos"
       FROM veiculos
      WHERE status <> 'INATIVO'`,
  ))!;

  // ---------------------------------------------------------------------------
  // Quilometragem, do veículo que mais rodou para o que menos rodou
  // ---------------------------------------------------------------------------
  const porVeiculoKm = await consultar<{ id: number; placa: string; modelo: string; kmAtual: number }>(
    pool,
    `SELECT id, placa, modelo, km_atual AS "kmAtual"
       FROM veiculos
      WHERE status <> 'INATIVO'
      ORDER BY km_atual DESC`,
  );
  const kmTotal = porVeiculoKm.reduce((soma, v) => soma + v.kmAtual, 0);

  // ---------------------------------------------------------------------------
  // Custos: incluem veículos já inativados, para o histórico não mudar quando
  // um veículo é excluído (RN06)
  // ---------------------------------------------------------------------------
  const custosPorMes = await consultar<{ mes: string; total: number }>(
    pool,
    `SELECT to_char(data_realizacao, 'YYYY-MM') AS mes,
            COALESCE(SUM(custo), 0)            AS total
       FROM manutencoes
      WHERE status = 'REALIZADA' AND data_realizacao >= $1
      GROUP BY mes`,
    [dataParaColuna(inicioPeriodo)],
  );

  // Meses sem gasto também aparecem no gráfico, com zero
  const totalDoMes = new Map(custosPorMes.map((linha) => [linha.mes, Number(linha.total)]));
  const porMes = Array.from({ length: MESES_DO_GRAFICO }, (_, i) => {
    const mes = textoDeData(inicioDoMes(inicioPeriodo, i)).slice(0, 7);
    return { mes, total: totalDoMes.get(mes) ?? 0 };
  });

  const porTipo = (await consultarUm<{ PREVENTIVA: number; CORRETIVA: number }>(
    pool,
    `SELECT COALESCE(SUM(custo) FILTER (WHERE tipo = 'PREVENTIVA'), 0) AS "PREVENTIVA",
            COALESCE(SUM(custo) FILTER (WHERE tipo = 'CORRETIVA'),  0) AS "CORRETIVA"
       FROM manutencoes
      WHERE status = 'REALIZADA' AND data_realizacao >= $1`,
    [dataParaColuna(inicioPeriodo)],
  ))!;

  const porVeiculoCusto = await consultar<{ id: number; placa: string; modelo: string; total: number }>(
    pool,
    `SELECT v.id, v.placa, v.modelo, SUM(mt.custo) AS total
       FROM manutencoes mt
       JOIN veiculos v ON v.id = mt.veiculo_id
      WHERE mt.status = 'REALIZADA' AND mt.data_realizacao >= $1 AND mt.custo IS NOT NULL
      GROUP BY v.id, v.placa, v.modelo
      HAVING SUM(mt.custo) > 0
      ORDER BY total DESC
      LIMIT 5`,
    [dataParaColuna(inicioPeriodo)],
  );

  const realizadasNoMes = (await consultarUm<{ total: number }>(
    pool,
    `SELECT COUNT(*) AS total FROM manutencoes WHERE status = 'REALIZADA' AND data_realizacao >= $1`,
    [dataParaColuna(inicioMesAtual)],
  ))!.total;

  // ---------------------------------------------------------------------------
  // Manutenções pendentes da frota ativa, com a situação calculada (RF03)
  // ---------------------------------------------------------------------------
  const pendentes = await consultar<{ dataProgramada: string | null; kmLimite: number | null; kmAtual: number }>(
    pool,
    `SELECT mt.data_programada AS "dataProgramada", mt.km_limite AS "kmLimite", v.km_atual AS "kmAtual"
       FROM manutencoes mt
       JOIN veiculos v ON v.id = mt.veiculo_id
      WHERE mt.status = 'PENDENTE' AND v.status <> 'INATIVO'`,
  );

  const situacoes: (Situacao | null)[] = pendentes.map(
    (m) =>
      calcularSituacao(
        { dataProgramada: m.dataProgramada ? dataDeTexto(m.dataProgramada) : null, kmLimite: m.kmLimite },
        m.kmAtual,
        contexto.antecedencia,
        contexto.hoje,
      ).situacao,
  );

  const dashboard: Dashboard = {
    frota,
    quilometragem: {
      total: kmTotal,
      media: porVeiculoKm.length ? Math.round(kmTotal / porVeiculoKm.length) : 0,
      porVeiculo: porVeiculoKm.map((v) => ({ ...v, placa: v.placa.trim() })),
    },
    custos: {
      mesAtual: porMes.at(-1)?.total ?? 0,
      mesAnterior: porMes.at(-2)?.total ?? 0,
      ultimos12Meses: porMes.reduce((soma, m) => soma + m.total, 0),
      porMes,
      porTipo: { PREVENTIVA: Number(porTipo.PREVENTIVA), CORRETIVA: Number(porTipo.CORRETIVA) },
      porVeiculo: porVeiculoCusto.map((v) => ({ ...v, placa: v.placa.trim(), total: Number(v.total) })),
    },
    manutencoes: {
      pendentes: situacoes.length,
      vencidas: situacoes.filter((s) => s === 'VENCIDA').length,
      proximas: situacoes.filter((s) => s === 'PROXIMA').length,
      realizadasNoMes,
    },
  };

  res.json(dashboard);
});
