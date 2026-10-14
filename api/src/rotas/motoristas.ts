// Motoristas da frota (RF01).
import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../autenticacao.js';
import { consultar, consultarUm, dataParaColuna, dataParaIso, emTransacao, pool, type Executor } from '../banco.js';
import { COLUNAS_MOTORISTA, contextoAlertas, garantirUnico, onde, type ContextoAlertas } from '../consultas.js';
import { ErroApi, naoEncontrado } from '../erros.js';
import { dataDeTexto } from '../regras/datas.js';
import { somenteDigitos } from '../regras/documentos.js';
import { calcularSituacaoCnh } from '../regras/situacao.js';
import { cnh, cpf, data, lerId, opcional, telefone, texto } from '../regras/validacao.js';
import type { Motorista } from '../tipos.js';

const motoristaSchema = z.object({
  nome: texto(120),
  cpf,
  cnh,
  categoriaCnh: z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'], { error: 'Selecione a categoria da CNH.' }),
  validadeCnh: data,
  telefone: opcional(telefone),
});

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  // ?ativo=false lista os inativos (excluídos)
  ativo: z
    .enum(['true', 'false'])
    .default('true')
    .transform((valor) => valor === 'true'),
});

type LinhaMotorista = Omit<Motorista, 'veiculo' | 'situacaoCnh' | 'diasParaVencer'> & {
  veiculoId: number | null;
  veiculoPlaca: string | null;
  veiculoModelo: string | null;
};

const SELECT_MOTORISTA = `
  SELECT ${COLUNAS_MOTORISTA},
         v.id     AS "veiculoId",
         v.placa  AS "veiculoPlaca",
         v.modelo AS "veiculoModelo"
    FROM motoristas m
    LEFT JOIN veiculos v ON v.motorista_id = m.id`;

/** Monta o formato do painel: veículo aninhado e situação da CNH calculada (RF03). */
function formatar(linha: LinhaMotorista, contexto: ContextoAlertas): Motorista {
  const { veiculoId, veiculoPlaca, veiculoModelo, ...motorista } = linha;
  return {
    ...motorista,
    // CHAR(11) do PostgreSQL vem com espaços à direita quando o valor é menor
    cpf: motorista.cpf.trim(),
    cnh: motorista.cnh.trim(),
    validadeCnh: dataParaIso(motorista.validadeCnh) ?? '',
    veiculo: veiculoId === null ? null : { id: veiculoId, placa: (veiculoPlaca ?? '').trim(), modelo: veiculoModelo ?? '' },
    ...calcularSituacaoCnh(dataDeTexto(motorista.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
  };
}

async function obterOuFalhar(executor: Executor, id: number): Promise<LinhaMotorista> {
  const linha = await consultarUm<LinhaMotorista>(executor, `${SELECT_MOTORISTA} WHERE m.id = $1`, [id]);
  if (!linha) throw naoEncontrado('Motorista');
  return linha;
}

/** Sem duplicidade de CPF e CNH (RF01). */
async function validarUnicos(executor: Executor, dados: { cpf: string; cnh: string }, idAtual?: number) {
  await garantirUnico(executor, 'motoristas', 'cpf', 'cpf', dados.cpf, 'este CPF', idAtual);
  await garantirUnico(executor, 'motoristas', 'cnh', 'cnh', dados.cnh, 'esta CNH', idAtual);
}

export const rotasMotoristas = Router();

rotasMotoristas.use(autenticar);

rotasMotoristas.get('/', async (req, res) => {
  const { busca, ativo } = filtrosSchema.parse(req.query);
  const valores: unknown[] = [ativo];

  let filtroBusca: string | null = null;
  if (busca) {
    // CPF e CNH são comparados só pelos dígitos: "123.456" encontra "12345678909"
    const digitos = somenteDigitos(busca);
    valores.push(`%${busca}%`, digitos === '' ? null : `%${digitos}%`);
    filtroBusca = `(
      unaccent(m.nome) ILIKE unaccent($2)
      OR ($3::TEXT IS NOT NULL AND (m.cpf LIKE $3 OR m.cnh LIKE $3))
    )`;
  }

  const linhas = await consultar<LinhaMotorista>(
    pool,
    `${SELECT_MOTORISTA} ${onde(['m.ativo = $1', filtroBusca])} ORDER BY unaccent(lower(m.nome))`,
    valores,
  );

  const contexto = await contextoAlertas(pool);
  res.json(linhas.map((linha) => formatar(linha, contexto)));
});

rotasMotoristas.get('/:id', async (req, res) => {
  const linha = await obterOuFalhar(pool, lerId(req.params.id));
  res.json(formatar(linha, await contextoAlertas(pool)));
});

rotasMotoristas.post('/', async (req, res) => {
  const dados = motoristaSchema.parse(req.body);

  const criado = await emTransacao(async (executor) => {
    await validarUnicos(executor, dados);
    const { id } = (await consultarUm<{ id: number }>(
      executor,
      `INSERT INTO motoristas (nome, cpf, cnh, categoria_cnh, validade_cnh, telefone)
            VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
      [dados.nome, dados.cpf, dados.cnh, dados.categoriaCnh, dataParaColuna(dados.validadeCnh), dados.telefone],
    ))!;
    return obterOuFalhar(executor, id);
  });

  res.status(201).json(formatar(criado, await contextoAlertas(pool)));
});

rotasMotoristas.put('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  const dados = motoristaSchema.parse(req.body);

  const atualizado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (!atual.ativo) {
      throw new ErroApi('Este motorista está inativo. Reative-o antes de editar.', 400);
    }
    await validarUnicos(executor, dados, id);

    await executor.query(
      `UPDATE motoristas
          SET nome = $1, cpf = $2, cnh = $3, categoria_cnh = $4, validade_cnh = $5,
              telefone = $6, atualizado_em = NOW()
        WHERE id = $7`,
      [dados.nome, dados.cpf, dados.cnh, dados.categoriaCnh, dataParaColuna(dados.validadeCnh), dados.telefone, id],
    );
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(atualizado, await contextoAlertas(pool)));
});

/**
 * RN06, exclusão lógica: o motorista sai das listagens e deixa de ser
 * responsável pelo veículo, mas o cadastro é mantido.
 */
rotasMotoristas.delete('/:id', async (req, res) => {
  const id = lerId(req.params.id);
  await emTransacao(async (executor) => {
    await obterOuFalhar(executor, id);
    await executor.query('UPDATE veiculos SET motorista_id = NULL, atualizado_em = NOW() WHERE motorista_id = $1', [id]);
    await executor.query('UPDATE motoristas SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1', [id]);
  });
  res.status(204).end();
});

rotasMotoristas.post('/:id/reativar', async (req, res) => {
  const id = lerId(req.params.id);

  const reativado = await emTransacao(async (executor) => {
    const atual = await obterOuFalhar(executor, id);
    if (atual.ativo) throw new ErroApi('Este motorista já está ativo.', 400);

    await executor.query('UPDATE motoristas SET ativo = TRUE, atualizado_em = NOW() WHERE id = $1', [id]);
    return obterOuFalhar(executor, id);
  });

  res.json(formatar(reativado, await contextoAlertas(pool)));
});
