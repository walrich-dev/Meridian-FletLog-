import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { adicionarDias, dataDeTexto, diasEntre, hoje, inicioDoMes, textoDeData } from './datas.js';
import { calcularDigitosCpf, cpfValido, formatarPlaca, normalizarBusca, somenteDigitos } from './documentos.js';
import { conferirSenha, gerarHashSenha, gerarToken } from './senha.js';
import { chassi, cnh, data, dataAteHoje, dinheiro, inteiro, opcional, placa, renavam, telefone } from './validacao.js';

/** Mensagem do primeiro erro de validação. */
function erro(schema: z.ZodType, valor: unknown) {
  const resultado = schema.safeParse(valor);
  return resultado.success ? null : (resultado.error.issues[0]?.message ?? null);
}

describe('datas', () => {
  it('calcula "hoje" no fuso de Brasília, não no do computador', () => {
    // 01h UTC do dia 02 ainda é 22h do dia 01 em Brasília (UTC-3)
    expect(textoDeData(hoje(new Date('2026-10-02T01:00:00Z')))).toBe('2026-10-01');
    expect(textoDeData(hoje(new Date('2026-10-02T03:00:00Z')))).toBe('2026-10-02');
  });

  it('conta dias e meses', () => {
    expect(diasEntre(dataDeTexto('2026-10-17'), dataDeTexto('2026-11-10'))).toBe(24);
    expect(textoDeData(adicionarDias(dataDeTexto('2026-12-25'), 10))).toBe('2027-01-04');
    expect(textoDeData(inicioDoMes(dataDeTexto('2026-10-17'), -11))).toBe('2025-11-01');
  });
});

describe('CPF', () => {
  it('calcula os dígitos verificadores', () => {
    expect(calcularDigitosCpf('123456789')).toBe('09');
    expect(calcularDigitosCpf('529982247')).toBe('25');
    expect(calcularDigitosCpf('987654321')).toBe('00'); // resto menor que 2
  });

  it('valida CPFs com ou sem pontuação e recusa sequências repetidas', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-26')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('1234567890')).toBe(false);
    expect(somenteDigitos(' (61) 99123-4567 ')).toBe('61991234567');
  });
});

describe('documentos do veículo', () => {
  it('normaliza a placa e aceita os padrões antigo e Mercosul', () => {
    expect(placa.parse('abc-1234')).toBe('ABC1234');
    expect(placa.parse(' rta 1b23 ')).toBe('RTA1B23');
    expect(erro(placa, 'AB-12345')).toMatch(/Placa inválida/);
    expect(erro(placa, '')).toBe('Campo obrigatório.');
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234');
    expect(formatarPlaca('RTA1B23')).toBe('RTA1B23');
  });

  it('valida o chassi (17 caracteres, sem I, O e Q)', () => {
    expect(chassi.parse('9bm979076nb100001')).toBe('9BM979076NB100001');
    expect(erro(chassi, '9BM979076NB10000I')).toMatch(/Chassi inválido/);
  });

  it('completa RENAVAM antigo de 9 dígitos com zeros', () => {
    expect(renavam.parse('123456789')).toBe('00123456789');
    expect(erro(renavam, '12345')).toMatch(/RENAVAM inválido/);
  });
});

describe('documentos do motorista', () => {
  it('aceita CNH e telefone com pontuação', () => {
    expect(cnh.parse('045.123.456-78')).toBe('04512345678');
    expect(telefone.parse('(61) 99123-0001')).toBe('61991230001');
    expect(erro(telefone, '9123-0001')).toMatch(/Telefone inválido/);
  });
});

describe('campos genéricos', () => {
  it('converte vazio em null nos campos opcionais', () => {
    const schema = opcional(inteiro());
    expect(schema.parse('')).toBeNull();
    expect(schema.parse('   ')).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
    expect(schema.parse('1500')).toBe(1500);
  });

  it('aceita valores em reais com vírgula e arredonda os centavos', () => {
    expect(dinheiro.parse('1234,56')).toBe(1234.56);
    expect(dinheiro.parse(99.999)).toBe(100);
    expect(erro(dinheiro, -1)).toBe('O valor não pode ser negativo.');
  });

  it('lê datas com ou sem horário e recusa datas impossíveis ou futuras', () => {
    expect(data.parse('2026-10-17')).toEqual(dataDeTexto('2026-10-17'));
    expect(data.parse('2026-10-17T00:00:00.000Z')).toEqual(dataDeTexto('2026-10-17'));
    expect(erro(data, '2026-02-30')).toBe('Informe uma data válida.');
    expect(erro(dataAteHoje, textoDeData(adicionarDias(hoje(), 1)))).toBe('A data não pode ser futura.');
  });

  it('recusa números decimais em campos inteiros', () => {
    expect(erro(inteiro(), 10.5)).toMatch(/inteiro/);
    expect(erro(inteiro(), 'abc')).toBe('Informe um número.');
    expect(erro(inteiro(), undefined)).toBe('Campo obrigatório.');
  });
});

describe('busca', () => {
  it('ignora maiúsculas e acentos', () => {
    expect(normalizarBusca('  Higienização ')).toBe('higienizacao');
  });
});

describe('senhas', () => {
  it('guarda a senha com sal e confere sem precisar do texto original', async () => {
    const hash = await gerarHashSenha('Frota@2026');

    expect(hash).not.toContain('Frota@2026');
    // O bcrypt usa um sal diferente a cada vez, então o mesmo texto gera hashes distintos
    expect(await gerarHashSenha('Frota@2026')).not.toBe(hash);

    expect(await conferirSenha('Frota@2026', hash)).toBe(true);
    expect(await conferirSenha('frota@2026', hash)).toBe(false);
  });

  it('gera tokens de sessão aleatórios de 64 caracteres', () => {
    const token = gerarToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(gerarToken()).not.toBe(token);
  });
});
