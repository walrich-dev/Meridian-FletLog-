import { describe, expect, it } from 'vitest';
import { dataDeTexto } from './datas.js';
import { calcularSituacao, calcularSituacaoCnh, piorSituacao, proximaProgramacao } from './situacao.js';

const HOJE = dataDeTexto('2026-10-17');
const ANTECEDENCIA = { km: 500, dias: 15 };

describe('calcularSituacao (RF03)', () => {
  const porData = (data: string) => ({ dataProgramada: dataDeTexto(data), kmLimite: null });
  const porKm = (kmLimite: number) => ({ dataProgramada: null, kmLimite });

  it('fica em dia quando está longe dos limites', () => {
    expect(calcularSituacao(porData('2026-12-01'), 0, ANTECEDENCIA, HOJE)).toEqual({
      situacao: 'EM_DIA',
      diasRestantes: 45,
      kmRestantes: null,
    });
    expect(calcularSituacao(porKm(60_000), 50_000, ANTECEDENCIA, HOJE).situacao).toBe('EM_DIA');
  });

  it('fica próxima quando faltam até N dias, inclusive no dia programado', () => {
    expect(calcularSituacao(porData('2026-11-01'), 0, ANTECEDENCIA, HOJE).situacao).toBe('PROXIMA'); // 15 dias
    expect(calcularSituacao(porData('2026-11-02'), 0, ANTECEDENCIA, HOJE).situacao).toBe('EM_DIA'); // 16 dias
    expect(calcularSituacao(porData('2026-10-17'), 0, ANTECEDENCIA, HOJE)).toMatchObject({
      situacao: 'PROXIMA',
      diasRestantes: 0,
    });
  });

  it('vence no dia seguinte à data programada', () => {
    expect(calcularSituacao(porData('2026-10-16'), 0, ANTECEDENCIA, HOJE)).toMatchObject({
      situacao: 'VENCIDA',
      diasRestantes: -1,
    });
  });

  it('fica próxima quando faltam até N km e vence ao atingir o km limite', () => {
    expect(calcularSituacao(porKm(50_000), 49_500, ANTECEDENCIA, HOJE).situacao).toBe('PROXIMA'); // faltam 500
    expect(calcularSituacao(porKm(50_000), 49_499, ANTECEDENCIA, HOJE).situacao).toBe('EM_DIA'); // faltam 501
    expect(calcularSituacao(porKm(50_000), 50_000, ANTECEDENCIA, HOJE).situacao).toBe('VENCIDA');
    expect(calcularSituacao(porKm(50_000), 52_400, ANTECEDENCIA, HOJE).kmRestantes).toBe(-2_400);
  });

  it('com data e km, vale o critério que vencer primeiro', () => {
    const ambos = { dataProgramada: dataDeTexto('2027-06-01'), kmLimite: 50_000 };
    expect(calcularSituacao(ambos, 50_100, ANTECEDENCIA, HOJE).situacao).toBe('VENCIDA'); // km venceu, data não
    expect(calcularSituacao(ambos, 10_000, ANTECEDENCIA, HOJE).situacao).toBe('EM_DIA');
  });

  it('não calcula situação sem data nem km programados', () => {
    expect(calcularSituacao({ dataProgramada: null, kmLimite: null }, 0, ANTECEDENCIA, HOJE).situacao).toBeNull();
  });
});

describe('piorSituacao', () => {
  it('escolhe a mais grave e ignora as sem situação', () => {
    expect(piorSituacao(['EM_DIA', 'VENCIDA', 'PROXIMA'])).toBe('VENCIDA');
    expect(piorSituacao([null, 'EM_DIA', 'PROXIMA'])).toBe('PROXIMA');
    expect(piorSituacao([null])).toBeNull();
    expect(piorSituacao([])).toBeNull();
  });
});

describe('proximaProgramacao (recorrência)', () => {
  const realizacao = { data: dataDeTexto('2026-03-01'), km: 40_000 };

  it('soma os intervalos à data e ao km em que o serviço foi feito', () => {
    expect(proximaProgramacao({ intervaloKm: 10_000, intervaloDias: 180 }, realizacao)).toEqual({
      kmLimite: 50_000,
      dataProgramada: dataDeTexto('2026-08-28'),
    });
  });

  it('usa só o intervalo informado', () => {
    expect(proximaProgramacao({ intervaloKm: 10_000, intervaloDias: null }, realizacao)).toEqual({
      kmLimite: 50_000,
      dataProgramada: null,
    });
    expect(proximaProgramacao({ intervaloKm: null, intervaloDias: 365 }, realizacao)).toEqual({
      kmLimite: null,
      dataProgramada: dataDeTexto('2027-03-01'),
    });
  });

  it('não gera a próxima quando não há recorrência', () => {
    expect(proximaProgramacao({ intervaloKm: null, intervaloDias: null }, realizacao)).toBeNull();
  });
});

describe('calcularSituacaoCnh', () => {
  it('classifica como válida, vencendo ou vencida', () => {
    expect(calcularSituacaoCnh(dataDeTexto('2027-01-01'), 15, HOJE)).toEqual({ situacaoCnh: 'VALIDA', diasParaVencer: 76 });
    expect(calcularSituacaoCnh(dataDeTexto('2026-10-27'), 15, HOJE).situacaoCnh).toBe('VENCENDO');
    expect(calcularSituacaoCnh(dataDeTexto('2026-10-17'), 15, HOJE).situacaoCnh).toBe('VENCENDO'); // vence hoje
    expect(calcularSituacaoCnh(dataDeTexto('2026-10-16'), 15, HOJE)).toEqual({ situacaoCnh: 'VENCIDA', diasParaVencer: -1 });
  });
});
