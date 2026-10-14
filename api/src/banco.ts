// Conexão com o PostgreSQL usando node-postgres (pg), com SQL escrito à mão.
import pg from 'pg';

const { Pool, types } = pg;

// -----------------------------------------------------------------------------
// Como os tipos do PostgreSQL chegam ao JavaScript
// -----------------------------------------------------------------------------

// DATE: por padrão o pg devolveria um Date na meia-noite local, o que muda o dia
// conforme o fuso do servidor. Mantemos o texto "AAAA-MM-DD" e convertemos adiante.
types.setTypeParser(types.builtins.DATE, (valor) => valor);

// NUMERIC (custo): por padrão vem como texto, para não perder precisão.
// Aqui os valores são pequenos, então número simples basta.
types.setTypeParser(types.builtins.NUMERIC, (valor) => Number(valor));

// BIGINT: o resultado de COUNT(*) vem como texto; o painel espera número.
types.setTypeParser(types.builtins.INT8, (valor) => Number(valor));

export const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE ?? 'meridian',
  max: 10,
});

// -----------------------------------------------------------------------------
// Consultas
// -----------------------------------------------------------------------------

/** Quem executa a consulta: o pool ou, dentro de uma transação, o cliente dela. */
export type Executor = Pick<pg.PoolClient, 'query'>;

/** Qualquer linha devolvida pelo banco. */
type Linha = pg.QueryResultRow;

/** Executa uma consulta e devolve todas as linhas. */
export async function consultar<T extends Linha>(
  executor: Executor,
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const { rows } = await executor.query<T>(sql, valores);
  return rows;
}

/** Executa uma consulta e devolve a primeira linha, ou null se não houver nenhuma. */
export async function consultarUm<T extends Linha>(
  executor: Executor,
  sql: string,
  valores: unknown[] = [],
): Promise<T | null> {
  const linhas = await consultar<T>(executor, sql, valores);
  return linhas[0] ?? null;
}

/**
 * Executa várias operações como uma transação: ou todas funcionam, ou nenhuma
 * é gravada. É o que garante, por exemplo, que concluir uma manutenção e
 * programar a próxima aconteçam juntas.
 */
export async function emTransacao<T>(acao: (executor: Executor) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await acao(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

// -----------------------------------------------------------------------------
// Conversão de datas
// -----------------------------------------------------------------------------

/** "2026-10-17" (como vem do banco) para "2026-10-17T00:00:00.000Z" (como o painel espera). */
export const dataParaIso = (data: string | null): string | null => (data === null ? null : `${data}T00:00:00.000Z`);

/** Date para "2026-10-17", o formato que uma coluna DATE aceita. */
export const dataParaColuna = (data: Date | null): string | null => (data === null ? null : data.toISOString().slice(0, 10));
