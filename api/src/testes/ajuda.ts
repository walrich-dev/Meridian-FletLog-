// Apoio aos testes: sobe a API numa porta livre e prepara o banco de teste.
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { app } from '../app.js';
import { pool } from '../banco.js';
import { popularBanco } from '../scripts/popular-banco.js';

let endereco = '';

/** Sobe a API numa porta escolhida pelo sistema operacional. */
export async function iniciarApi(): Promise<string> {
  if (endereco) return endereco;
  const servidor = app.listen(0);
  await new Promise((pronto) => servidor.once('listening', pronto));
  endereco = `http://localhost:${(servidor.address() as AddressInfo).port}/api`;
  return endereco;
}

/** Recria as tabelas e grava a frota de demonstração. */
export async function prepararBanco(): Promise<void> {
  const schema = await readFile(new URL('../../sql/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  await popularBanco(pool);
}

export const encerrar = () => pool.end();

type Resposta<T> = { status: number; corpo: T };

/** Faz uma requisição à API e devolve o status e o corpo já convertido. */
export async function pedir<T = any>(
  metodo: string,
  caminho: string,
  opcoes: { corpo?: unknown; token?: string | null } = {},
): Promise<Resposta<T>> {
  const resposta = await fetch(`${await iniciarApi()}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
  });
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  return { status: resposta.status, corpo: corpo as T };
}

/** Entra no sistema e devolve o token da sessão. */
export async function entrar(email: string, senha: string): Promise<string> {
  const { corpo } = await pedir<{ token: string }>('POST', '/auth/login', { corpo: { email, senha } });
  return corpo.token;
}

export const ADMIN = { email: 'admin@meridian.local', senha: 'Frota@2026' };
export const GESTOR = { email: 'gestor@meridian.local', senha: 'Gestor@2026' };

/** Data de hoje no formato AAAA-MM-DD. */
export const hojeTexto = () => new Date().toISOString().slice(0, 10);
