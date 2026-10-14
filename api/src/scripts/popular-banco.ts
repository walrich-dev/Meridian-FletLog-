// Preenche o banco com a frota de demonstração.
//
// Uso:  npm run banco:popular
//
// Apaga o que existe e recria tudo, para a apresentação sempre começar igual.
import { pool, type Executor } from '../banco.js';
import { gerarHashSenha } from '../regras/senha.js';
import { ACESSOS_DEMONSTRACAO, criarDadosDemonstracao } from './dados-demonstracao.js';

/**
 * Apaga os dados atuais e grava a frota de demonstração.
 * As sequências de id voltam a 1, para os ids ficarem iguais a cada execução.
 */
export async function popularBanco(executor: Executor): Promise<void> {
  const { motoristas, veiculos, manutencoes } = criarDadosDemonstracao();

  // Quem está usando o sistema não deve ser deslogado pela restauração. As sessões
  // são guardadas aqui porque o TRUNCATE em usuarios leva junto as sessões ligadas a eles.
  const { rows: sessoes } = await executor.query<{ token: string; usuarioId: number; expiraEm: Date }>(
    'SELECT token, usuario_id AS "usuarioId", expira_em AS "expiraEm" FROM sessoes',
  );

  // RESTART IDENTITY zera os contadores; CASCADE limpa as tabelas ligadas por chave estrangeira
  await executor.query('TRUNCATE manutencoes, veiculos, motoristas, usuarios, sessoes RESTART IDENTITY CASCADE');

  for (const acesso of ACESSOS_DEMONSTRACAO) {
    await executor.query('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4)', [
      acesso.nome,
      acesso.email,
      await gerarHashSenha(acesso.senha),
      acesso.perfil,
    ]);
  }

  // Os usuários voltam com os mesmos ids (RESTART IDENTITY), então as sessões
  // deles continuam valendo. As de usuários que não existem mais são descartadas.
  for (const sessao of sessoes) {
    await executor.query(
      `INSERT INTO sessoes (token, usuario_id, expira_em)
            SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = $2)`,
      [sessao.token, sessao.usuarioId, sessao.expiraEm],
    );
  }

  for (const m of motoristas) {
    await executor.query(
      `INSERT INTO motoristas (id, nome, cpf, cnh, categoria_cnh, validade_cnh, telefone)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [m.id, m.nome, m.cpf, m.cnh, m.categoriaCnh, m.validadeCnh, m.telefone],
    );
  }

  for (const v of veiculos) {
    await executor.query(
      `INSERT INTO veiculos (id, placa, marca, modelo, chassi, renavam, ano_aquisicao, km_atual, status, motorista_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [v.id, v.placa, v.marca, v.modelo, v.chassi, v.renavam, v.anoAquisicao, v.kmAtual, v.status, v.motoristaId],
    );
  }

  for (const mt of manutencoes) {
    await executor.query(
      `INSERT INTO manutencoes
            (veiculo_id, tipo, descricao, status, data_programada, km_limite,
             intervalo_km, intervalo_dias, data_realizacao, km_realizacao, custo, oficina)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        mt.veiculoId,
        mt.tipo,
        mt.descricao,
        mt.status,
        mt.dataProgramada,
        mt.kmLimite,
        mt.intervaloKm,
        mt.intervaloDias,
        mt.dataRealizacao,
        mt.kmRealizacao,
        mt.custo,
        mt.oficina,
      ],
    );
  }

  // Os ids de motoristas e veículos foram informados à mão, então as sequências
  // precisam ser avançadas para os próximos cadastros não colidirem
  await executor.query(`SELECT setval('motoristas_id_seq', (SELECT MAX(id) FROM motoristas))`);
  await executor.query(`SELECT setval('veiculos_id_seq',   (SELECT MAX(id) FROM veiculos))`);

  // Volta a antecedência dos alertas para o padrão
  await executor.query(
    `UPDATE configuracoes SET alerta_antecedencia_km = 500, alerta_antecedencia_dias = 15, atualizado_em = NOW() WHERE id = 1`,
  );
}

// Execução pela linha de comando
if (process.argv[1]?.includes('popular-banco')) {
  try {
    await popularBanco(pool);
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM usuarios)    AS usuarios,
              (SELECT COUNT(*) FROM motoristas)  AS motoristas,
              (SELECT COUNT(*) FROM veiculos)    AS veiculos,
              (SELECT COUNT(*) FROM manutencoes) AS manutencoes`,
    );
    console.log('Dados de demonstração gravados:', rows[0]);
    console.log('\nAcessos:');
    for (const a of ACESSOS_DEMONSTRACAO) console.log(`  ${a.perfil.padEnd(6)}  ${a.email}  ${a.senha}`);
  } catch (erro) {
    console.error('Falha ao popular o banco:', erro);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
