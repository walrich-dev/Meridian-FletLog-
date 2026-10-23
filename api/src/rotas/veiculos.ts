// Veículos da frota (RF01).
import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../autenticacao.js';
import { consultar, consultarUm, dataParaIso, emTransacao, pool, type Executor } from '../banco.js';
import { COLUNAS_VEICULO, contextoAlertas, garantirUnico, onde } from '../consultas.js';
import { ErroApi, erroDeCampo, naoEncontrado } from '../erros.js';
import { dataDeTexto } from '../regras/datas.js';
import { calcularSituacao, calcularSituacaoCnh, piorSituacao } from '../regras/situacao.js';
import { chassi, id, inteiro, lerId, opcional, placa, renavam, texto } from '../regras/validacao.js';
import type { Situacao, Veiculo, VeiculoDetalhe, VeiculoListagem } from '../tipos.js';

/** Teto de quilometragem aceito: acima disso é erro de digitação, não hodômetro. */
const KM_MAXIMO = 2_000_000;

const veiculoSchema = z.object({
  placa,
  marca: texto(60),
  modelo: texto(60),
  chassi,
  renavam,
  anoAquisicao: inteiro({ min: 1950, max: new Date().getFullYear() }),
  kmAtual: inteiro({ max: KM_MAXIMO }),
  // INATIVO não é aceito aqui: a inativação é feita pelo DELETE
  status: z
    .enum(['ATIVO', 'EM_MANUTENCAO'], { error: 'Selecione o status: ativo ou em manutenção.' })
    .default('ATIVO'),
  motoristaId: opcional(id),
});

const atualizarKmSchema = z.object({ kmAtual: inteiro({ max: KM_MAXIMO }) });

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  status: z.enum(['ATIVO', 'EM_MANUTENCAO', 'INATIVO']).optional(),
});

const formatarPlaca = (p: string) => (/^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p);

type LinhaVeiculo = Omit<Veiculo, 'motorista'> & { motoristaNome: string | null };

const SELECT_VEICULO = `
  SELECT ${COLUNAS_VEICULO}, m.nome AS "motoristaNome"
    FROM veiculos v
    LEFT JOIN motoristas m ON m.id = v.motorista_id`;

/** Monta o formato que o painel espera, com os dados do motorista aninhados. */
const formatar = ({ motoristaNome, ...veiculo }: LinhaVeiculo): Veiculo => ({
  ...veiculo,
  motorista: veiculo.motoristaId === null ? null : { id: veiculo.motoristaId, nome: motoristaNome ?? '' },
});

async function obterOuFalhar(executor: Executor, id: number): Promise<LinhaVeiculo> {
  const linha = await consultarUm<LinhaVeiculo>(executor, `${SELECT_VEICULO} WHERE v.id = $1`, [id]);
  if (!linha) throw naoEncontrado('Veículo');
  return linha;
}

/** O motorista precisa estar ativo e não pode ser responsável por outro veículo (RN06). */
async function validarMotorista(executor: Executor, motoristaId: number | null, veiculoId = 0) {
  if (motoristaId === null) return;

  const motorista = await consultarUm<{ nome: string; ativo: boolean }>(
    executor,
    'SELECT nome, ativo FROM motoristas WHERE id = $1',
    [motoristaId],
  );
  if (!motorista?.ativo) {
    throw new ErroApi('Motorista não encontrado ou inativo.', 400, {
      motoristaId: ['Selecione um motorista ativo.'],
    });
  }

  const outro = await consultarUm<{ placa: string }>(
    executor,
    'SELECT placa FROM veiculos WHERE motorista_id = $1 AND id <> $2',
    [motoristaId, veiculoId],
  );
  if (outro) {
    throw erroDeCampo(
      'motoristaId',
      `${motorista.nome} já é responsável pelo veículo ${formatarPlaca(outro.placa.trim())}.`,
      409,
    );
  }
}

/** Sem duplicidade de placa, chassi e RENAVAM (RF01). */
async function validarUnicos(
  executor: Executor,
  dados: { placa: string; chassi: string; renavam: string },
  idAtual?: number,
) {
  await garantirUnico(executor, 'veiculos', 'placa', 'placa', dados.placa, 'esta placa', idAtual);
  await garantirUnico(executor, 'veiculos', 'chassi', 'chassi', dados.chassi, 'este chassi', idAtual);
  await garantirUnico(executor, 'veiculos', 'renavam', 'renavam', dados.renavam, 'este RENAVAM', idAtual);
}

export const rotasVeiculos = Router();

rotasVeiculos.use(autenticar);

rotasVeiculos.get('/', async (req, res) => {
  const { busca, status } = filtrosSchema.parse(req.query);
  const valores: unknown[] = [];

  // Sem filtro explícito, os inativos ficam de fora da listagem (RN06)
  valores.push(status ?? null);
  const filtroStatus = `($1::status_veiculo IS NULL AND v.status <> 'INATIVO' OR v.status = $1::status_veiculo)`;

  let filtroBusca: string | null = null;
  if (busca) {
    // A placa é comparada sem pontuação: "abc-1d23" encontra "ABC1D23"
    valores.push(`%${busca}%`, `%${busca.toUpperCase().replace(/[^A-Z0-9]/g, '')}%`);
    filtroBusca = `(
      v.placa LIKE $3
      OR unaccent(v.marca)  ILIKE unaccent($2)
      OR unaccent(v.modelo) ILIKE unaccent($2)
      OR unaccent(m.nome)   ILIKE unaccent($2)
    )`;
  }

  const linhas = await consultar<LinhaVeiculo>(
    pool,
    `${SELECT_VEICULO} ${onde([filtroStatus, filtroBusca])} ORDER BY v.placa`,
    valores,
  );

  // A situação mais grave entre as manutenções pendentes vira o selo da listagem (RF03)
  const contexto = await contextoAlertas(pool);
  const pendentes = await consultar<{ veiculoId: number; dataProgramada: string | null; kmLimite: number | null }>(
    pool,
    `SELECT veiculo_id AS "veiculoId", data_programada AS "dataProgramada", km_limite AS "kmLimite"
       FROM manutencoes WHERE status = 'PENDENTE'`,
  );

  const veiculos: VeiculoListagem[] = linhas.map((linha) => {
    const doVeiculo = pendentes.filter((m) => m.veiculoId === linha.id);
    const situacoes: (Situacao | null)[] = doVeiculo.map(
      (m) =>
        calcularSituacao(
          { dataProgramada: m.dataProgramada ? dataDeTexto(m.dataProgramada) : null, kmLimite: m.kmLimite },
          linha.kmAtual,
          contexto.antecedencia,
          contexto.hoje,
        ).situacao,
    );
    return {
      ...formatar(linha),
      manutencoesPendentes: doVeiculo.length,
      situacaoManutencao: linha.status === 'INATIVO' ? null : piorSituacao(situacoes),
    };
  });

  res.json(veiculos);
});

rotasVeiculos.get('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const linha = await obterOuFalhar(pool, id);
  const contexto = await contextoAlertas(pool);

  const resumo = await consultarUm<{ custoTotal: number; realizadas: number }>(
    pool,
    `SELECT COALESCE(SUM(custo), 0) AS "custoTotal", COUNT(*) AS realizadas
       FROM manutencoes WHERE veiculo_id = $1 AND status = 'REALIZADA'`,
    [id],
  );

  const motorista =
    linha.motoristaId === null
      ? null
      : await consultarUm<{ id: number; nome: string; telefone: string | null; validadeCnh: string }>(
          pool,
          `SELECT id, nome, telefone, validade_cnh AS "validadeCnh" FROM motoristas WHERE id = $1`,
          [linha.motoristaId],
        );

  const { motoristaNome: _nome, ...dados } = linha;
  const detalhe: VeiculoDetalhe = {
    ...dados,
    motorista: motorista
      ? {
          id: motorista.id,
          nome: motorista.nome,
          telefone: motorista.telefone,
          validadeCnh: dataParaIso(motorista.validadeCnh) ?? '',
          ...calcularSituacaoCnh(dataDeTexto(motorista.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
        }
      : null,
    custoTotal: resumo?.custoTotal ?? 0,
    manutencoesRealizadas: resumo?.realizadas ?? 0,
  };

  res.json(detalhe);
});

rotasVeiculos.post('/', async (req, res) => {
  const dados = veiculoSchema.parse(req.body);

  const criado = await emTransacao(async (executor) => {
    await validarUnicos(executor, dados);
    await validarMotorista(executor, dados.motoristaId);

    const { id: novoId } = (await consultarUm<{ id: number }>(
      executor,
      `INSERT INTO veiculos (placa, marca, modelo, chassi, renavam, ano_aquisicao, km_atual, status, motorista_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
      [
        dados.placa,
        dados.marca,
        dados.modelo,
        dados.chassi,
        dados.renavam,
        dados.anoAquisicao,
        dados.kmAtual,
        dados.status,
        dados.motoristaId,
      ],
    ))!;
    return obterOuFalhar(executor, novoId);
  });

  res.status(201).json(formatar(criado));
});

rotasVeiculos.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const dados = veiculoSchema.parse(req.body);

  const atualizado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status === 'INATIVO') {
      throw new ErroApi('Este veículo está inativo. Reative-o antes de editar.', 400);
    }
    await validarUnicos(executor, dados, id);
    await validarMotorista(executor, dados.motoristaId, id);

    await executor.query(
      `UPDATE veiculos
          SET placa = $1, marca = $2, modelo = $3, chassi = $4, renavam = $5,
              ano_aquisicao = $6, km_atual = $7, status = $8, motorista_id = $9,
              atualizado_em = NOW()
        WHERE id = $10`,
      [
        dados.placa,
        dados.marca,
        dados.modelo,
        dados.chassi,
        dados.renavam,
        dados.anoAquisicao,
        dados.kmAtual,
        dados.status,
        dados.motoristaId,
        id,
      ],
    );
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(atualizado));
});

/** Atualização rápida do hodômetro, base dos alertas por quilometragem (RF03). */
rotasVeiculos.patch('/:id/km', async (req, res) => {
  const id = lerId(req.params.id);
  const { kmAtual } = atualizarKmSchema.parse(req.body);

  const atualizado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status === 'INATIVO') throw new ErroApi('Este veículo está inativo.', 400);

    // RN05: o hodômetro só avança. Para corrigir um valor errado, use a edição completa.
    if (kmAtual < atual.kmAtual) {
      throw erroDeCampo(
        'kmAtual',
        `A quilometragem não pode ser menor que a atual (${atual.kmAtual.toLocaleString('pt-BR')} km).`,
      );
    }
    await executor.query('UPDATE veiculos SET km_atual = $1, atualizado_em = NOW() WHERE id = $2', [kmAtual, id]);
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(atualizado));
});

/**
 * RN06, exclusão lógica: o veículo sai das listagens e dos alertas, mas o
 * histórico de manutenções e custos é preservado. O motorista fica livre.
 */
rotasVeiculos.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  await emTransacao(async (executor) => {
    await obterOuFalhar(executor, id);
    await executor.query(
      `UPDATE veiculos SET status = 'INATIVO', motorista_id = NULL, atualizado_em = NOW() WHERE id = $1`,
      [id],
    );
  });
  res.status(204).end();
});

rotasVeiculos.post('/:id/reativar', async (req, res) => {
  const id = lerId(req.params.id);

  const reativado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.status !== 'INATIVO') throw new ErroApi('Este veículo já está ativo.', 400);

    await executor.query(`UPDATE veiculos SET status = 'ATIVO', atualizado_em = NOW() WHERE id = $1`, [id]);
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(reativado));
});
