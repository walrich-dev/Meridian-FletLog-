// Senhas nunca são guardadas em texto puro. O bcrypt gera um hash com sal
// embutido e é propositalmente lento, para dificultar ataques de força bruta.
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

/** Custo do bcrypt: quanto maior, mais lento e mais seguro. 10 é o padrão recomendado. */
const CUSTO = 10;

export const gerarHashSenha = (senha: string): Promise<string> => bcrypt.hash(senha, CUSTO);

export const conferirSenha = (senha: string, hash: string): Promise<boolean> => bcrypt.compare(senha, hash);

/** Token de sessão: 32 bytes aleatórios em hexadecimal (64 caracteres). */
export const gerarToken = (): string => randomBytes(32).toString('hex');
