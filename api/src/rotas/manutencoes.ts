// Manutenções programadas e realizadas (RF02 e RF03).
import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../autenticacao.js';
import { consultar, consultarUm, dataParaColuna, dataParaIso, emTransacao, pool, type Executor } from '../banco.js';
import { COLUNAS_MANUTENCAO, contextoAlertas, onde, type ContextoAlertas } from '../consultas.js';
import { ErroApi, naoEncontrado } from '../erros.js';
import { dataDeTexto } from '../regras/datas.js';
import { calcularSituacao, GRAVIDADE, proximaProgramacao } from '../regras/situacao.js';
import { data, dataAteHoje, dinheiro, id, inteiro, lerId, opcional, texto } from '../regras/validacao.js';
import type { Manutencao, StatusVeiculo } from '../tipos.js';

const KM_MAXIMO = 2_000_000;

const TIPO = z.enum(['PREVENTIVA', 'CORRETIVA'], { error: 'Selecione o tipo: preventiva ou corretiva.' });

const campos = {
  veiculoId: id,
  tipo: TIPO,
  descricao: texto(255),

  // Programação (critérios dos alertas do RF03)
  dataProgramada: opcional(data),
  kmLimite: opcional(inteiro({ max: KM_MAXIMO })),

  // Recorrência: ao concluir, a próxima é programada com estes intervalos
  intervaloKm: opcional(inteiro({ min: 1, max: 1_000_000 })),
  intervaloDias: opcional(inteiro({ min: 1, max: 3650 })),

  // Execução (preenchidos quando a manutenção é realizada)
  dataRealizacao: opcional(dataAteHoje),
  kmRealizacao: opcional(inteiro({ max: KM_MAXIMO })),
  custo: opcional(dinheiro),
  oficina: opcional(texto(120)),
};

const criarSchema = z.object({
  ...campos,
  status: z.enum(['PENDENTE', 'REALIZADA'], { error: 'Status inválido.' }).default('PENDENTE'),
});

const atualizarSchema = z.object(campos);

const concluirSchema = z.object({
  dataRealizacao: dataAteHoje,
  kmRealizacao: opcional(inteiro({ max: KM_MAXIMO })),
  custo: opcional(dinheiro),
  oficina: opcional(texto(120)),
  // Se o veículo estava "em manutenção", volta a ficar ativo
  liberarVeiculo: z.boolean().default(false),
});

const filtrosSchema = z.object({
  veiculoId: z.coerce.number().int().positive().optional(),
  status: z.enum(['PENDENTE', 'REALIZADA', 'CANCELADA']).optional(),
  tipo: TIPO.optional(),
  situacao: z.enum(['VENCIDA', 'PROXIMA', 'EM_DIA']).optional(),
  busca: z.string().trim().optional(),
});

type DadosManutencao = z.infer<typeof atualizarSchema>;

type LinhaManutencao = Omit<Manutencao, 'veiculo' | 'situacao' | 'diasRestantes' | 'kmRestantes'> & {
  veiculoPlaca: string;
  veiculoMarca: string;
  veiculoModelo: string;
  veiculoKmAtual: number;
  veiculoStatus: StatusVeiculo;
};

const SELECT_MANUTENCAO = `
  SELECT ${COLUNAS_MANUTENCAO},
         v.placa    AS "veiculoPlaca",
         v.marca    AS "veiculoMarca",
         v.modelo   AS "veiculoModelo",
         v.km_atual AS "veiculoKmAtual",
         v.status   AS "veiculoStatus"
    FROM manutencoes mt
    JOIN veiculos v ON v.id = mt.veiculo_id`;

/** Formato de resposta: dados do veículo e, nas pendentes, a situação calculada (RF03). */
function formatar(linha: LinhaManutencao, contexto: ContextoAlertas): Manutencao {
  const { veiculoPlaca, veiculoMarca, veiculoModelo, veiculoKmAtual, veiculoStatus, ...manutencao } = linha;

  const situacao =
    manutencao.status === 'PENDENTE'
      ? calcularSituacao(
          {
            dataProgramada: manutencao.dataProgramada ? dataDeTexto(manutencao.dataProgramada) : null,
            kmLimite: manutencao.kmLimite,
          },
          veiculoKmAtual,
          contexto.antecedencia,
          contexto.hoje,
        )
      : { situacao: null, diasRestantes: null, kmRestantes: null };

  return {
    ...manutencao,
    dataProgramada: dataParaIso(manutencao.dataProgramada),
    dataRealizacao: dataParaIso(manutencao.dataRealizacao),
    veiculo: {
      id: manutencao.veiculoId,
      placa: veiculoPlaca.trim(),
      marca: veiculoMarca,
      modelo: veiculoModelo,
      kmAtual: veiculoKmAtual,
      status: veiculoStatus,
    },
    ...situacao,
  };
}

/** Pendentes primeiro, das mais graves; depois o histórico, do mais recente. */
function ordenar(a: Manutencao, b: Manutencao) {
  const ORDEM_STATUS = { PENDENTE: 0, REALIZADA: 1, CANCELADA: 2 };
  const gravidade = (m: Manutencao) => (m.status !== 'PENDENTE' ? 10 : m.situacao ? GRAVIDADE[m.situacao] : 3);
  const compararData = (x: string | null, y: string | null, direcao: 1 | -1) => {
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x < y ? -direcao : direcao;
  };
  return (
    ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
    gravidade(a) - gravidade(b) ||
    compararData(a.dataRealizacao, b.dataRealizacao, -1) ||
    compararData(a.dataProgramada, b.dataProgramada, 1) ||
    b.id - a.id
  );
}

async function obterOuFalhar(executor: Executor, id: number): Promise<LinhaManutencao> {
  const linha = await consultarUm<LinhaManutencao>(executor, `${SELECT_MANUTENCAO} WHERE mt.id = $1`, [id]);
  if (!linha) throw naoEncontrado('Manutenção');
  return linha;
}

async function veiculoDisponivel(executor: Executor, veiculoId: number) {
  const veiculo = await consultarUm<{ id: number; kmAtual: number; status: StatusVeiculo }>(
    executor,
    `SELECT id, km_atual AS "kmAtual", status FROM veiculos WHERE id = $1`,
    [veiculoId],
  );
  if (!veiculo) {
    throw new ErroApi('Veículo não encontrado.', 400, { veiculoId: ['Selecione um veículo.'] });
  }
  if (veiculo.status === 'INATIVO') {
    throw new ErroApi('Este veículo está inativo.', 400, { veiculoId: ['Selecione um veículo ativo.'] });
  }
  return veiculo;
}

/** Regras que dependem da combinação de campos e do status (RN04). */
function aplicarRegras(dados: DadosManutencao, status: 'PENDENTE' | 'REALIZADA' | 'CANCELADA'): DadosManutencao {
  const semProgramacao = dados.dataProgramada === null && dados.kmLimite === null;
  const erros: Record<string, string[]> = {};

  if (status === 'PENDENTE' && dados.tipo === 'PREVENTIVA' && semProgramacao) {
    const mensagem = 'Na preventiva, informe a data programada, o km limite ou os dois.';
    erros.dataProgramada = [mensagem];
    erros.kmLimite = [mensagem];
  }
  if (status === 'REALIZADA' && dados.dataRealizacao === null) {
    erros.dataRealizacao = ['Informe a data em que o serviço foi realizado.'];
  }
  if (Object.keys(erros).length > 0) {
    throw new ErroApi('Dados inválidos.', 400, erros);
  }

  // Pendente ainda não tem dados de execução
  if (status === 'PENDENTE') {
    return { ...dados, dataRealizacao: null, kmRealizacao: null, custo: null };
  }
  // Preventiva já realizada e sem programação: considera-se programada para o dia em que foi feita
  if (dados.tipo === 'PREVENTIVA' && semProgramacao) {
    return { ...dados, dataProgramada: dados.dataRealizacao };
  }
  return dados;
}

/** O hodômetro acompanha a quilometragem do serviço, mas só avança (RN05). */
async function atualizarHodometro(executor: Executor, veiculoId: number, kmRealizacao: number | null) {
  if (kmRealizacao === null) return;
  await executor.query(
    'UPDATE veiculos SET km_atual = $1, atualizado_em = NOW() WHERE id = $2 AND km_atual < $1',
    [kmRealizacao, veiculoId],
  );
}

/**
 * Efeitos de uma manutenção realizada: hodômetro, liberação do veículo e,
 * se for preventiva recorrente, a próxima programada automaticamente (RN03).
 */
async function aposRealizacao(
  executor: Executor,
  manutencao: LinhaManutencao,
  veiculo: { id: number; kmAtual: number; status: StatusVeiculo },
  liberarVeiculo: boolean,
): Promise<LinhaManutencao | null> {
  const kmAnterior = veiculo.kmAtual;
  await atualizarHodometro(executor, veiculo.id, manutencao.kmRealizacao);

  if (liberarVeiculo && veiculo.status === 'EM_MANUTENCAO') {
    await executor.query(`UPDATE veiculos SET status = 'ATIVO', atualizado_em = NOW() WHERE id = $1`, [veiculo.id]);
  }

  if (manutencao.tipo !== 'PREVENTIVA' || manutencao.dataRealizacao === null) return null;

  const programacao = proximaProgramacao(manutencao, {
    data: dataDeTexto(manutencao.dataRealizacao),
    km: manutencao.kmRealizacao ?? kmAnterior,
  });
  if (!programacao) return null;

  const { id: novoId } = (await consultarUm<{ id: number }>(
    executor,
    `INSERT INTO manutencoes (veiculo_id, tipo, descricao, status, data_programada, km_limite, intervalo_km, intervalo_dias)
          VALUES ($1, 'PREVENTIVA', $2, 'PENDENTE', $3, $4, $5, $6)
       RETURNING id`,
    [
      veiculo.id,
      manutencao.descricao,
      dataParaColuna(programacao.dataProgramada),
      programacao.kmLimite,
      manutencao.intervaloKm,
      manutencao.intervaloDias,
    ],
  ))!;

  return obterOuFalhar(executor, novoId);
}

export const rotasManutencoes = Router();

rotasManutencoes.use(autenticar);

rotasManutencoes.get('/', async (req, res) => {
  const { veiculoId, status, tipo, situacao, busca } = filtrosSchema.parse(req.query);
  // A situação só existe nas pendentes
  const statusFiltro = situacao ? 'PENDENTE' : status;

  const valores: unknown[] = [veiculoId ?? null, statusFiltro ?? null, tipo ?? null];
  let filtroBusca: string | null = null;
  if (busca) {
    valores.push(`%${busca}%`, `%${busca.toUpperCase().replace(/[^A-Z0-9]/g, '')}%`);
    filtroBusca = `(
      unaccent(mt.descricao) ILIKE unaccent($4)
      OR unaccent(mt.oficina) ILIKE unaccent($4)
      OR v.placa LIKE $5
    )`;
  }

  const linhas = await consultar<LinhaManutencao>(
    pool,
    `${SELECT_MANUTENCAO} ${onde([
      '($1::INTEGER IS NULL OR mt.veiculo_id = $1)',
      '($2::status_manutencao IS NULL OR mt.status = $2)',
      '($3::tipo_manutencao IS NULL OR mt.tipo = $3)',
      filtroBusca,
    ])}`,
    valores,
  );

  const contexto = await contextoAlertas(pool);
  const manutencoes = linhas
    .map((linha) => formatar(linha, contexto))
    // A situação é calculada, então o filtro por ela é aplicado depois da consulta
    .filter((m) => !situacao || m.situacao === situacao)
    .sort(ordenar);

  res.json(manutencoes);
});

rotasManutencoes.get('/:id', async (req, res) => {
  const linha = await obterOuFalhar(pool, lerId(req.params.id));
  res.json(formatar(linha, await contextoAlertas(pool)));
});

/** Programa uma manutenção (PENDENTE) ou registra um serviço já feito (REALIZADA). */
rotasManutencoes.post('/', async (req, res) => {
  const { status, ...dados } = criarSchema.parse(req.body);

  const resultado = await emTransacao(async (executor) => {
    const veiculo = await veiculoDisponivel(executor, dados.veiculoId);
    const valores = aplicarRegras(dados, status);

    const { id: novoId } = (await consultarUm<{ id: number }>(
      executor,
      `INSERT INTO manutencoes
            (veiculo_id, tipo, descricao, status, data_programada, km_limite,
             intervalo_km, intervalo_dias, data_realizacao, km_realizacao, custo, oficina)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
      [
        valores.veiculoId,
        valores.tipo,
        valores.descricao,
        status,
        dataParaColuna(valores.dataProgramada),
        valores.kmLimite,
        valores.intervaloKm,
        valores.intervaloDias,
        dataParaColuna(valores.dataRealizacao),
        valores.kmRealizacao,
        valores.custo,
        valores.oficina,
      ],
    ))!;

    const criada = await obterOuFalhar(executor, novoId);
    const proxima = status === 'REALIZADA' ? await aposRealizacao(executor, criada, veiculo, false) : null;
    // Relê para o hodômetro atualizado aparecer na resposta
    return { manutencao: await obterOuFalhar(executor, novoId), proxima };
  });

  const contexto = await contextoAlertas(pool);
  res.status(201).json({
    manutencao: formatar(resultado.manutencao, contexto),
    proxima: resultado.proxima && formatar(resultado.proxima, contexto),
  });
});

rotasManutencoes.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const dados = atualizarSchema.parse(req.body);

  const atualizada = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status === 'CANCELADA') {
      throw new ErroApi('Manutenções canceladas não podem ser editadas.', 400);
    }
    await veiculoDisponivel(executor, dados.veiculoId);
    const valores = aplicarRegras(dados, atual.status);

    await executor.query(
      `UPDATE manutencoes
          SET veiculo_id = $1, tipo = $2, descricao = $3, data_programada = $4, km_limite = $5,
              intervalo_km = $6, intervalo_dias = $7, data_realizacao = $8, km_realizacao = $9,
              custo = $10, oficina = $11, atualizado_em = NOW()
        WHERE id = $12`,
      [
        valores.veiculoId,
        valores.tipo,
        valores.descricao,
        dataParaColuna(valores.dataProgramada),
        valores.kmLimite,
        valores.intervaloKm,
        valores.intervaloDias,
        dataParaColuna(valores.dataRealizacao),
        valores.kmRealizacao,
        valores.custo,
        valores.oficina,
        id,
      ],
    );
    await atualizarHodometro(executor, valores.veiculoId, valores.kmRealizacao);
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(atualizada, await contextoAlertas(pool)));
});

/**
 * Registra a realização de uma manutenção pendente. Se for uma preventiva
 * recorrente, a próxima é programada automaticamente (RN03).
 */
rotasManutencoes.post('/:id/concluir', async (req, res) => {
  const id = lerId(req.params.id);
  const { liberarVeiculo, ...execucao } = concluirSchema.parse(req.body);

  const resultado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status !== 'PENDENTE') {
      throw new ErroApi('Somente manutenções pendentes podem ser concluídas.', 400);
    }
    const veiculo = await veiculoDisponivel(executor, atual.veiculoId);

    await executor.query(
      `UPDATE manutencoes
          SET status = 'REALIZADA', data_realizacao = $1, km_realizacao = $2,
              custo = $3, oficina = COALESCE($4, oficina), atualizado_em = NOW()
        WHERE id = $5`,
      [dataParaColuna(execucao.dataRealizacao), execucao.kmRealizacao, execucao.custo, execucao.oficina, id],
    );

    const concluida = await obterOuFalhar(executor, id);
    const proxima = await aposRealizacao(executor, concluida, veiculo, liberarVeiculo);
    return { manutencao: await obterOuFalhar(executor, id), proxima };
  });

  const contexto = await contextoAlertas(pool);
  res.json({
    manutencao: formatar(resultado.manutencao, contexto),
    proxima: resultado.proxima && formatar(resultado.proxima, contexto),
  });
});

rotasManutencoes.post('/:id/cancelar', async (req, res) => {
  const id = lerId(req.params.id);

  const cancelada = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status !== 'PENDENTE') {
      throw new ErroApi('Somente manutenções pendentes podem ser canceladas.', 400);
    }
    await executor.query(`UPDATE manutencoes SET status = 'CANCELADA', atualizado_em = NOW() WHERE id = $1`, [id]);
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(cancelada, await contextoAlertas(pool)));
});

/** RN07: as realizadas compõem o histórico de custos e não podem ser excluídas. */
rotasManutencoes.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status === 'REALIZADA') {
      throw new ErroApi(
        'Manutenções realizadas fazem parte do histórico de custos e não podem ser excluídas. Corrija os dados pela edição.',
        400,
      );
    }
    await executor.query('DELETE FROM manutencoes WHERE id = $1', [id]);
  });
  res.status(204).end();
});
