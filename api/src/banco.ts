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

// -----------------------------------------------------------------------------
// Endereço do banco
// -----------------------------------------------------------------------------

// Hospedagens de banco (Neon, Render, Supabase) entregam a conexão como uma URL
// única. Na máquina de quem desenvolve é mais prático ter as partes separadas.
// Aceitamos as duas formas, com a URL tendo preferência quando existe.
const urlDoBanco = process.env.DATABASE_URL?.trim() || undefined;

// Banco hospedado recusa conexão sem TLS; PostgreSQL local responde em texto
// claro e não tem certificado. Ligamos o TLS quando a URL pede (`sslmode=`, que
// é como as hospedagens entregam o endereço) ou quando PGSSL=1.
//
// Deixar `ssl: true` significa verificar o certificado — o padrão do Node. Isso
// importa: sem a verificação a conexão fica criptografada mas aceita qualquer
// certificado, e alguém no meio do caminho poderia se passar pelo banco e ler a
// senha. As hospedagens usam certificados de autoridades públicas, então a
// verificação funciona sem configuração nenhuma.
const comTls = process.env.PGSSL === '1' || (urlDoBanco !== undefined && /[?&]sslmode=/.test(urlDoBanco));

export const pool = new Pool({
  ...(urlDoBanco
    ? { connectionString: urlDoBanco }
    : {
        host: process.env.PGHOST ?? 'localhost',
        port: Number(process.env.PGPORT ?? 5432),
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE ?? 'meridian',
      }),
  ssl: comTls,
  max: 10,
});

/** Onde o banco está, para as mensagens de log. Nunca inclui a senha. */
export function enderecoDoBanco(): string {
  if (!urlDoBanco) return `${process.env.PGDATABASE ?? 'meridian'} em ${process.env.PGHOST ?? 'localhost'}`;
  try {
    const url = new URL(urlDoBanco);
    return `${url.pathname.replace('/', '')} em ${url.hostname}`;
  } catch {
    return 'configurado por DATABASE_URL';
  }
}

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
