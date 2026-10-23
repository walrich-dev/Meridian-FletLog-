// Cria (ou recria) as tabelas do banco a partir de sql/schema.sql.
//
// Uso:  npm run banco:criar
//
// Atenção: o schema começa com DROP TABLE, então todos os dados são apagados.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../banco.js';
import { exigirConfirmacaoEmProducao } from './protecao.js';

exigirConfirmacaoEmProducao('banco:criar');

const pastaDoArquivo = dirname(fileURLToPath(import.meta.url));
const caminhoDoSchema = join(pastaDoArquivo, '..', '..', 'sql', 'schema.sql');

try {
  const schema = await readFile(caminhoDoSchema, 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query<{ tabela: string }>(
    `SELECT tablename AS tabela FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(`Banco "${process.env.PGDATABASE ?? 'meridian'}" criado com ${rows.length} tabelas:`);
  for (const { tabela } of rows) console.log(`  - ${tabela}`);
  console.log('\nPara gravar os dados de demonstração: npm run banco:popular');
} catch (erro) {
  console.error('Falha ao criar o banco:', erro);
  process.exitCode = 1;
} finally {
  await pool.end();
}
