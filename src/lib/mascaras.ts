// Máscaras aplicadas enquanto o usuário digita. A API aceita os valores com ou
// sem pontuação e grava só o necessário (ex.: CPF só com dígitos).

const digitos = (valor: string) => valor.replace(/\D/g, '');

/** Só dígitos: evita que "49.420" (com ponto de milhar) seja lido como 49,42 */
export const mascaraInteiro = (valor: string) => digitos(valor).slice(0, 9);

export const mascaraPlaca = (valor: string) =>
  valor
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 8);

export const mascaraChassi = (valor: string) =>
  valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 17);

export const mascaraRenavam = (valor: string) => digitos(valor).slice(0, 11);

export const mascaraCnh = (valor: string) => digitos(valor).slice(0, 11);

export function mascaraCpf(valor: string): string {
  const d = digitos(valor).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

export function mascaraTelefone(valor: string): string {
  const d = digitos(valor).slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}
