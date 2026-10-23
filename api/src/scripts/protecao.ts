// Trava os comandos que apagam dados quando a API está em produção.
//
// `banco:criar` recria as tabelas e `banco:popular` dá TRUNCATE em tudo. Em
// desenvolvimento isso é o esperado; num sistema em uso, é perda de dados.
// Para rodar de propósito em produção (a primeira instalação, por exemplo):
//
//   CONFIRMAR_APAGAR_TUDO=sim npm run banco:criar

/** Encerra o processo se estivermos em produção e ninguém tiver confirmado. */
export function exigirConfirmacaoEmProducao(comando: string): void {
  const emProducao = process.env.NODE_ENV === 'production';
  const confirmado = process.env.CONFIRMAR_APAGAR_TUDO === 'sim';

  if (!emProducao || confirmado) return;

  console.error(
    [
      `"${comando}" apaga os dados e a API está em produção (NODE_ENV=production).`,
      '',
      'Se for mesmo isso que você quer, repita o comando assim:',
      `  CONFIRMAR_APAGAR_TUDO=sim npm run ${comando}`,
    ].join('\n'),
  );
  process.exit(1);
}
