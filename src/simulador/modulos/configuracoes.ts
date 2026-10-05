// Antecedência dos alertas (RF03). Só o ADMIN altera.
import { z } from 'zod';
import type { Configuracao } from '../../lib/tipos';
import type { Banco } from '../banco';
import { inteiro } from '../regras/validacao';
import { agora } from './comum';

const configuracaoSchema = z.object({
  alertaAntecedenciaKm: inteiro({ max: 100_000 }),
  alertaAntecedenciaDias: inteiro({ max: 365 }),
});

export function obter(banco: Banco): Configuracao {
  return { ...banco.configuracao };
}

export function atualizar(banco: Banco, corpo: unknown): Configuracao {
  banco.configuracao = { ...configuracaoSchema.parse(corpo), atualizadoEm: agora() };
  return obter(banco);
}
