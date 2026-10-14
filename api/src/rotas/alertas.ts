// RF03: manutenções pendentes vencidas ou próximas do limite (por data ou km) e
// CNHs vencidas ou perto de vencer. Veículos inativos não geram alertas.
import { Router } from 'express';
import { autenticar } from '../autenticacao.js';
import { consultar, dataParaColuna, dataParaIso, pool } from '../banco.js';
import { contextoAlertas } from '../consultas.js';
import { adicionarDias, dataDeTexto } from '../regras/datas.js';
import { calcularSituacao, calcularSituacaoCnh, GRAVIDADE } from '../regras/situacao.js';
import type { AlertaCnh, Alertas, CategoriaCnh, Manutencao, StatusVeiculo } from '../tipos.js';

type LinhaPendente = {
  id: number;
  veiculoId: number;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  descricao: string;
  dataProgramada: string | null;
  kmLimite: number | null;
  intervaloKm: number | null;
  intervaloDias: number | null;
  oficina: string | null;
  veiculoPlaca: string;
  veiculoMarca: string;
  veiculoModelo: string;
  veiculoKmAtual: number;
  veiculoStatus: StatusVeiculo;
};

type LinhaCnh = {
  id: number;
  nome: string;
  categoriaCnh: CategoriaCnh;
  validadeCnh: string;
  veiculoId: number | null;
  veiculoPlaca: string | null;
};

export const rotasAlertas = Router();

rotasAlertas.use(autenticar);

rotasAlertas.get('/', async (_req, res) => {
  const contexto = await contextoAlertas(pool);

  // Só manutenções pendentes, de veículos ativos, que tenham algum critério de alerta
  const pendentes = await consultar<LinhaPendente>(
    pool,
    `SELECT mt.id,
            mt.veiculo_id      AS "veiculoId",
            mt.tipo, mt.descricao,
            mt.data_programada AS "dataProgramada",
            mt.km_limite       AS "kmLimite",
            mt.intervalo_km    AS "intervaloKm",
            mt.intervalo_dias  AS "intervaloDias",
            mt.oficina,
            v.placa    AS "veiculoPlaca",
            v.marca    AS "veiculoMarca",
            v.modelo   AS "veiculoModelo",
            v.km_atual AS "veiculoKmAtual",
            v.status   AS "veiculoStatus"
       FROM manutencoes mt
       JOIN veiculos v ON v.id = mt.veiculo_id
      WHERE mt.status = 'PENDENTE'
        AND v.status <> 'INATIVO'
        AND (mt.data_programada IS NOT NULL OR mt.km_limite IS NOT NULL)`,
  );

  const manutencoes: Manutencao[] = pendentes
    .map((linha) => {
      const situacao = calcularSituacao(
        {
          dataProgramada: linha.dataProgramada ? dataDeTexto(linha.dataProgramada) : null,
          kmLimite: linha.kmLimite,
        },
        linha.veiculoKmAtual,
        contexto.antecedencia,
        contexto.hoje,
      );
      return {
        id: linha.id,
        veiculoId: linha.veiculoId,
        tipo: linha.tipo,
        descricao: linha.descricao,
        status: 'PENDENTE' as const,
        dataProgramada: dataParaIso(linha.dataProgramada),
        kmLimite: linha.kmLimite,
        intervaloKm: linha.intervaloKm,
        intervaloDias: linha.intervaloDias,
        dataRealizacao: null,
        kmRealizacao: null,
        custo: null,
        oficina: linha.oficina,
        veiculo: {
          id: linha.veiculoId,
          placa: linha.veiculoPlaca.trim(),
          marca: linha.veiculoMarca,
          modelo: linha.veiculoModelo,
          kmAtual: linha.veiculoKmAtual,
          status: linha.veiculoStatus,
        },
        ...situacao,
      };
    })
    .filter((m) => m.situacao === 'VENCIDA' || m.situacao === 'PROXIMA')
    // Mais graves primeiro; depois, as que vencem antes
    .sort(
      (a, b) =>
        GRAVIDADE[a.situacao ?? 'EM_DIA'] - GRAVIDADE[b.situacao ?? 'EM_DIA'] ||
        (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity) ||
        (a.kmRestantes ?? Infinity) - (b.kmRestantes ?? Infinity),
    );

  // CNHs vencidas ou que vencem dentro da antecedência configurada
  const limiteCnh = adicionarDias(contexto.hoje, contexto.antecedencia.dias);
  const linhasCnh = await consultar<LinhaCnh>(
    pool,
    `SELECT m.id, m.nome,
            m.categoria_cnh AS "categoriaCnh",
            m.validade_cnh  AS "validadeCnh",
            v.id    AS "veiculoId",
            v.placa AS "veiculoPlaca"
       FROM motoristas m
       LEFT JOIN veiculos v ON v.motorista_id = m.id
      WHERE m.ativo = TRUE AND m.validade_cnh <= $1
      ORDER BY m.validade_cnh`,
    [dataParaColuna(limiteCnh)],
  );

  const cnh: AlertaCnh[] = linhasCnh.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    categoriaCnh: linha.categoriaCnh,
    validadeCnh: dataParaIso(linha.validadeCnh) ?? '',
    veiculo: linha.veiculoId === null ? null : { id: linha.veiculoId, placa: (linha.veiculoPlaca ?? '').trim() },
    ...calcularSituacaoCnh(dataDeTexto(linha.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
  }));

  const alertas: Alertas = {
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

  res.json(alertas);
});
