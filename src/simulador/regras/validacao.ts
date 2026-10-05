// Schemas Zod que validam os dados recebidos pela API simulada.
// Os documentos são normalizados antes da validação (ex.: "abc-1d23" -> "ABC1D23"),
// então o usuário pode digitar com ou sem pontuação.
import { z } from 'zod';
import { ErroApi } from '../erros';
import { dataDeTexto, hoje } from './datas';
import { cpfValido, somenteDigitos } from './documentos';

// Mensagens padrão do Zod em português (as principais são personalizadas abaixo)
z.config(z.locales.ptBR());

const OBRIGATORIO = 'Campo obrigatório.';

/** Texto vazio (ou só espaços) e campo ausente viram null. */
function vazioParaNull(valor: unknown) {
  if (valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  return valor;
}

/** Torna um campo opcional: aceita ausente, null ou "" e grava null. */
export function opcional<T extends z.ZodType>(schema: T) {
  return z.preprocess(vazioParaNull, schema.nullable());
}

/** Texto obrigatório, sem espaços nas pontas. */
export function texto(maximo: number) {
  return z
    .string({ error: OBRIGATORIO })
    .trim()
    .min(1, OBRIGATORIO)
    .max(maximo, `Use no máximo ${maximo} caracteres.`);
}

/** Número inteiro. Aceita também texto numérico ("1500"), como vem de formulários. */
export function inteiro({ min = 0, max = 2_000_000_000 }: { min?: number; max?: number } = {}) {
  return z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor),
    z
      .number({ error: (issue) => (issue.input === undefined ? OBRIGATORIO : 'Informe um número.') })
      .int('Informe um número inteiro, sem casas decimais.')
      .min(min, `O valor mínimo é ${min}.`)
      .max(max, `O valor máximo é ${max}.`),
  );
}

/** Valor em reais, arredondado para 2 casas. Aceita "1500,50". */
export const dinheiro = z
  .preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() !== '' ? Number(valor.replace(',', '.')) : valor),
    z
      .number({ error: (issue) => (issue.input === undefined ? OBRIGATORIO : 'Informe um valor.') })
      .min(0, 'O valor não pode ser negativo.')
      .max(99_999_999.99, 'Valor acima do permitido.'),
  )
  .transform((valor) => Math.round(valor * 100) / 100);

/** Data no formato AAAA-MM-DD (o horário, se enviado, é ignorado). */
export const data = z.preprocess(
  (valor) => (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor) ? valor.slice(0, 10) : valor),
  z.iso.date({ error: (issue) => (issue.input === undefined ? OBRIGATORIO : 'Informe uma data válida.') }).transform(dataDeTexto),
);

/** Data que não pode estar no futuro (ex.: data em que um serviço foi realizado). */
export const dataAteHoje = data.refine((valor) => valor <= hoje(), 'A data não pode ser futura.');

/** Identificador de outro registro enviado no corpo (ex.: veiculoId). */
export const id = inteiro({ min: 1, max: 2_147_483_647 });

/** Lê o :id da URL. */
export function lerId(valor: string | undefined): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 2_147_483_647) {
    throw new ErroApi('Identificador inválido.', 400);
  }
  return numero;
}

// -----------------------------------------------------------------------------
// Documentos
// -----------------------------------------------------------------------------

/** Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23). Grava sem hífen e em maiúsculas. */
export const placa = z
  .string({ error: OBRIGATORIO })
  .trim()
  .min(1, OBRIGATORIO)
  .transform((valor) => valor.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa inválida: use o padrão ABC1234 ou ABC1D23.'));

/** Chassi (VIN): 17 caracteres, letras e números, sem I, O e Q. */
export const chassi = z
  .string({ error: OBRIGATORIO })
  .trim()
  .min(1, OBRIGATORIO)
  .transform((valor) => valor.toUpperCase().replace(/[\s.-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Chassi inválido: deve ter 17 letras e números (as letras I, O e Q não são usadas).'),
  );

/** RENAVAM com 11 dígitos. Os antigos, de 9 ou 10 dígitos, são completados com zeros à esquerda. */
export const renavam = z
  .string({ error: OBRIGATORIO })
  .trim()
  .min(1, OBRIGATORIO)
  .transform((valor) => {
    const digitos = somenteDigitos(valor);
    return digitos.length === 9 || digitos.length === 10 ? digitos.padStart(11, '0') : digitos;
  })
  .pipe(z.string().regex(/^\d{11}$/, 'RENAVAM inválido: informe os 11 dígitos.'));

/** CPF com dígitos verificadores válidos. Grava só os dígitos. */
export const cpf = z
  .string({ error: OBRIGATORIO })
  .trim()
  .min(1, OBRIGATORIO)
  .transform(somenteDigitos)
  .refine(cpfValido, 'CPF inválido.');

/** Número de registro da CNH: 11 dígitos. */
export const cnh = z
  .string({ error: OBRIGATORIO })
  .trim()
  .min(1, OBRIGATORIO)
  .transform(somenteDigitos)
  .pipe(z.string().regex(/^\d{11}$/, 'CNH inválida: informe os 11 dígitos do número de registro.'));

/** Telefone com DDD: 10 (fixo) ou 11 (celular) dígitos. */
export const telefone = z
  .string()
  .transform(somenteDigitos)
  .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone inválido: informe o DDD e o número.'));

export const email = z
  .string({ error: OBRIGATORIO })
  .trim()
  .toLowerCase()
  .min(1, OBRIGATORIO)
  .pipe(z.email('E-mail inválido.').max(160, 'Use no máximo 160 caracteres.'));

export const senha = z
  .string({ error: OBRIGATORIO })
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.');
