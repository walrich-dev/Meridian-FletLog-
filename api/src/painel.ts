// Servir o painel pela própria API (opcional).
//
// Para hospedar nas nuvens, painel e API ficam em endereços separados. Mas para
// rodar tudo num só computador é mais simples a API entregar também os arquivos
// do painel: fica um único endereço, e aí não existe CORS nenhum para resolver.
//
// Liga-se com SERVIR_PAINEL apontando para a pasta gerada pelo `npm run build`:
//
//   SERVIR_PAINEL=../dist
//
// O painel precisa ter sido gerado com VITE_API_URL=/api, para as chamadas
// saírem relativas ao próprio endereço.
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import express, { type Express } from 'express';

/** Caminho da pasta do painel, ou null se SERVIR_PAINEL não estiver definida. */
export function pastaDoPainel(): string | null {
  const configurado = process.env.SERVIR_PAINEL?.trim();
  if (!configurado) return null;

  // Relativo resolve a partir da pasta api/, que é de onde a API roda
  return isAbsolute(configurado) ? configurado : resolve(process.cwd(), configurado);
}

/**
 * Entrega os arquivos do painel e, para qualquer outro endereço, o index.html —
 * o React Router cuida das telas no navegador, então /veiculos não é um arquivo.
 *
 * Precisa ser chamada depois das rotas /api e antes do tratamento de 404.
 */
export function servirPainel(app: Express, pasta: string): void {
  const indexHtml = join(pasta, 'index.html');

  if (!existsSync(indexHtml)) {
    console.error(
      [
        `SERVIR_PAINEL aponta para "${pasta}", mas não há index.html ali.`,
        'Gere o painel antes, na pasta do projeto:',
        '  npm run build',
      ].join('\n'),
    );
    process.exit(1);
  }

  // Os arquivos de assets/ têm o conteúdo no nome (index-D1irkQ5_.js), então
  // podem ser guardados pelo navegador para sempre: um novo build muda o nome.
  app.use(
    express.static(pasta, {
      index: false,
      setHeaders(res, caminho) {
        if (caminho.includes('assets')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  // O index.html nunca é guardado, senão o navegador continuaria pedindo os
  // arquivos do build antigo depois de uma atualização.
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });

  console.log(`Painel servido de ${pasta}`);
}
