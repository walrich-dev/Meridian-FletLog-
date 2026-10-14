// Antecedência dos alertas (RF03). Só o ADMIN pode alterar.
import { Router } from 'express';
import { z } from 'zod';
import { apenasPerfis, autenticar } from '../autenticacao.js';
import { consultarUm, pool } from '../banco.js';
import { inteiro } from '../regras/validacao.js';
import type { Configuracao } from '../tipos.js';

const configuracaoSchema = z.object({
  alertaAntecedenciaKm: inteiro({ max: 100_000 }),
  alertaAntecedenciaDias: inteiro({ max: 365 }),
});

const COLUNAS = `
  alerta_antecedencia_km   AS "alertaAntecedenciaKm",
  alerta_antecedencia_dias AS "alertaAntecedenciaDias",
  atualizado_em            AS "atualizadoEm"`;

export const rotasConfiguracoes = Router();

rotasConfiguracoes.use(autenticar);

rotasConfiguracoes.get('/', async (_req, res) => {
  const configuracao = await consultarUm<Configuracao>(pool, `SELECT ${COLUNAS} FROM configuracoes WHERE id = 1`);
  res.json(configuracao);
});

rotasConfiguracoes.put('/', apenasPerfis('ADMIN'), async (req, res) => {
  const dados = configuracaoSchema.parse(req.body);

  const atualizada = await consultarUm<Configuracao>(
    pool,
    `UPDATE configuracoes
        SET alerta_antecedencia_km = $1, alerta_antecedencia_dias = $2, atualizado_em = NOW()
      WHERE id = 1
  RETURNING ${COLUNAS}`,
    [dados.alertaAntecedenciaKm, dados.alertaAntecedenciaDias],
  );

  res.json(atualizada);
});
