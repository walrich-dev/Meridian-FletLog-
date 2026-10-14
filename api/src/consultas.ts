// Trechos de SQL reaproveitados pelas rotas.
//
// As colunas do banco usam snake_case (km_atual) e o painel espera camelCase
// (kmAtual), então renomeamos no próprio SELECT com AS "kmAtual".
import { consultar, consultarUm, type Executor } from './banco.js';
import { erroDeCampo } from './erros.js';
import { hoje } from './regras/datas.js';
import type { Antecedencia } from './regras/situacao.js';

// As consultas fazem JOIN com outras tabelas, que também têm colunas "id" e "nome",
// então cada coluna é qualificada com o apelido da sua tabela (v, m, mt).
export const COLUNAS_VEICULO = `
  v.id, v.placa, v.marca, v.modelo, v.chassi, v.renavam,
  v.ano_aquisicao AS "anoAquisicao",
  v.km_atual      AS "kmAtual",
  v.status,
  v.motorista_id  AS "motoristaId"`;

export const COLUNAS_MOTORISTA = `
  m.id, m.nome, m.cpf, m.cnh,
  m.categoria_cnh AS "categoriaCnh",
  m.validade_cnh  AS "validadeCnh",
  m.telefone, m.ativo`;

export const COLUNAS_MANUTENCAO = `
  mt.id,
  mt.veiculo_id      AS "veiculoId",
  mt.tipo, mt.descricao, mt.status,
  mt.data_programada AS "dataProgramada",
  mt.km_limite       AS "kmLimite",
  mt.intervalo_km    AS "intervaloKm",
  mt.intervalo_dias  AS "intervaloDias",
  mt.data_realizacao AS "dataRealizacao",
  mt.km_realizacao   AS "kmRealizacao",
  mt.custo, mt.oficina`;

export type ContextoAlertas = { antecedencia: Antecedencia; hoje: Date };

/** Antecedência configurada e data de hoje: tudo que o cálculo da situação precisa (RF03). */
export async function contextoAlertas(executor: Executor): Promise<ContextoAlertas> {
  const linha = await consultarUm<{ km: number; dias: number }>(
    executor,
    `SELECT alerta_antecedencia_km AS km, alerta_antecedencia_dias AS dias FROM configuracoes WHERE id = 1`,
  );
  return { antecedencia: linha ?? { km: 500, dias: 15 }, hoje: hoje() };
}

/**
 * Impede duplicidade antes de gravar, para responder 409 com a mensagem no campo
 * certo do formulário. O UNIQUE do banco continua sendo a garantia final.
 */
export async function garantirUnico(
  executor: Executor,
  tabela: string,
  coluna: string,
  campo: string,
  valor: unknown,
  rotulo: string,
  idAtual?: number,
) {
  const linhas = await consultar(
    executor,
    `SELECT 1 FROM ${tabela} WHERE ${coluna} = $1 AND id <> $2 LIMIT 1`,
    [valor, idAtual ?? 0],
  );
  if (linhas.length > 0) {
    throw erroDeCampo(campo, `Já existe um cadastro com ${rotulo}.`, 409);
  }
}

/**
 * Monta a cláusula WHERE a partir de condições opcionais.
 * Devolve string vazia quando não há nenhuma, para a consulta continuar válida.
 */
export const onde = (condicoes: (string | null)[]): string => {
  const ativas = condicoes.filter((c): c is string => c !== null);
  return ativas.length > 0 ? `WHERE ${ativas.join(' AND ')}` : '';
};
