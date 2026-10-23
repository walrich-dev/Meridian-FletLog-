// Cadastra um usuário pela linha de comando.
//
// Serve para criar o primeiro acesso de verdade, já que os dados de
// demonstração não devem ir para um sistema no ar: as senhas deles estão
// publicadas no repositório.
//
// Uso:
//   npm run usuario:criar -- "Seu Nome" voce@empresa.com SuaSenhaForte ADMIN
//
// O perfil é ADMIN ou GESTOR. Se o e-mail já existir, a senha é atualizada.
import { z } from 'zod';
import { pool } from '../banco.js';
import { gerarHashSenha } from '../regras/senha.js';
import { email, senha } from '../regras/validacao.js';

const entrada = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(120),
  email,
  senha,
  perfil: z.enum(['ADMIN', 'GESTOR'], { error: 'O perfil deve ser ADMIN ou GESTOR.' }),
});

const [nome, enderecoEmail, senhaInformada, perfil] = process.argv.slice(2);

if (!nome || !enderecoEmail || !senhaInformada || !perfil) {
  console.error(
    [
      'Faltam dados. Use:',
      '  npm run usuario:criar -- "Seu Nome" voce@empresa.com SuaSenhaForte ADMIN',
      '',
      'O perfil é ADMIN ou GESTOR.',
    ].join('\n'),
  );
  process.exit(1);
}

const resultado = entrada.safeParse({ nome, email: enderecoEmail, senha: senhaInformada, perfil });

if (!resultado.success) {
  console.error('Dados inválidos:');
  for (const [campo, mensagens] of Object.entries(z.flattenError(resultado.error).fieldErrors)) {
    console.error(`  ${campo}: ${mensagens?.join(' ')}`);
  }
  process.exit(1);
}

const dados = resultado.data;

try {
  // ON CONFLICT: repetir o comando com o mesmo e-mail troca a senha, que é o
  // jeito mais simples de recuperar o acesso se a senha for esquecida.
  const { rows } = await pool.query<{ id: number; criado: boolean }>(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
            SET nome = EXCLUDED.nome,
                senha_hash = EXCLUDED.senha_hash,
                perfil = EXCLUDED.perfil,
                ativo = TRUE,
                atualizado_em = NOW()
       RETURNING id, (xmax = 0) AS criado`,
    [dados.nome, dados.email, await gerarHashSenha(dados.senha), dados.perfil],
  );

  const { id, criado } = rows[0]!;
  console.log(`${criado ? 'Usuário criado' : 'Usuário atualizado'}: ${dados.email} (${dados.perfil}, id ${id})`);

  if (!criado) {
    // Trocar a senha invalida as sessões antigas, senão quem já estava dentro
    // continuaria dentro com a senha anterior.
    const { rowCount } = await pool.query('DELETE FROM sessoes WHERE usuario_id = $1', [id]);
    if (rowCount) console.log(`Sessões encerradas: ${rowCount}`);
  }
} catch (erro) {
  console.error('Falha ao cadastrar o usuário:', erro);
  process.exitCode = 1;
} finally {
  await pool.end();
}
