/** Remove tudo que não for dígito: "123.456.789-09" -> "12345678909". */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Calcula os dois dígitos verificadores do CPF a partir dos 9 primeiros dígitos
 * (algoritmo módulo 11 da Receita Federal).
 */
export function calcularDigitosCpf(base: string): string {
  if (!/^\d{9}$/.test(base)) {
    throw new Error('A base do CPF deve ter exatamente 9 dígitos.');
  }

  // Pesos decrescentes: 10..2 para o 1º dígito e 11..2 para o 2º
  const calcularDigito = (numeros: string) => {
    const pesoInicial = numeros.length + 1;
    const soma = [...numeros].reduce((total, numero, i) => total + Number(numero) * (pesoInicial - i), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(base);
  const segundo = calcularDigito(`${base}${primeiro}`);
  return `${primeiro}${segundo}`;
}

/** Valida um CPF, com ou sem pontuação. */
export function cpfValido(cpf: string): boolean {
  const numeros = somenteDigitos(cpf);
  if (numeros.length !== 11) return false;

  // Sequências repetidas (000.000.000-00, 111.111.111-11...) passam no cálculo, mas são inválidas
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  return calcularDigitosCpf(numeros.slice(0, 9)) === numeros.slice(9);
}

/** Placa para mensagens: padrão antigo com hífen (ABC-1234); Mercosul sem (ABC1D23). */
export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/** Texto para buscas: minúsculo e sem acentos ("Manutenção" -> "manutencao"). */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
