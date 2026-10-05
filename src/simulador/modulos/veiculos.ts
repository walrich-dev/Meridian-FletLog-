// RF01: cadastro, consulta, edição e exclusão (lógica) de veículos.
import { z } from 'zod';
import type { Veiculo, VeiculoDetalhe, VeiculoListagem } from '../../lib/tipos';
import { novoId, type Banco, type VeiculoRegistro } from '../banco';
import { erroDeCampo, ErroApi } from '../erros';
import { formatarPlaca } from '../regras/documentos';
import { calcularSituacao, calcularSituacaoCnh, piorSituacao } from '../regras/situacao';
import { chassi, id, inteiro, opcional, placa, renavam, texto } from '../regras/validacao';
import { agora, contem, contextoAlertas, garantirUnico, paraData } from './comum';

const KM_MAXIMO = 5_000_000;

const veiculoSchema = z.object({
  placa,
  marca: texto(60),
  modelo: texto(60),
  chassi,
  renavam,
  anoAquisicao: inteiro({ min: 1950, max: new Date().getFullYear() }),
  kmAtual: inteiro({ max: KM_MAXIMO }),
  // INATIVO não é aceito aqui: a inativação é feita pela exclusão (DELETE)
  status: z
    .enum(['ATIVO', 'EM_MANUTENCAO'], { error: 'Selecione o status: ativo ou em manutenção.' })
    .default('ATIVO'),
  motoristaId: opcional(id),
});

const atualizarKmSchema = z.object({ kmAtual: inteiro({ max: KM_MAXIMO }) });

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  // Sem status, lista todos menos os inativos
  status: z.enum(['ATIVO', 'EM_MANUTENCAO', 'INATIVO']).optional(),
});

function formatar(banco: Banco, veiculo: VeiculoRegistro): Veiculo {
  const motorista = banco.motoristas.find((m) => m.id === veiculo.motoristaId);
  return { ...veiculo, motorista: motorista ? { id: motorista.id, nome: motorista.nome } : null };
}

export function buscarOuFalhar(banco: Banco, id: number): VeiculoRegistro {
  const veiculo = banco.veiculos.find((v) => v.id === id);
  if (!veiculo) throw new ErroApi('Veículo não encontrado.', 404);
  return veiculo;
}

export function listar(banco: Banco, consulta: unknown): VeiculoListagem[] {
  const { busca, status } = filtrosSchema.parse(consulta);
  const termoPlaca = busca?.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const contexto = contextoAlertas(banco);

  return banco.veiculos
    .filter((veiculo) => (status ? veiculo.status === status : veiculo.status !== 'INATIVO'))
    .map((veiculo) => formatar(banco, veiculo))
    .filter(
      (veiculo) =>
        !busca ||
        (termoPlaca && veiculo.placa.includes(termoPlaca)) ||
        contem(veiculo.marca, busca) ||
        contem(veiculo.modelo, busca) ||
        contem(veiculo.motorista?.nome ?? null, busca),
    )
    .sort((a, b) => a.placa.localeCompare(b.placa))
    .map((veiculo) => {
      const pendentes = banco.manutencoes.filter((m) => m.veiculoId === veiculo.id && m.status === 'PENDENTE');
      // A situação mais grave entre as manutenções pendentes (badge na listagem)
      const situacoes = pendentes.map(
        (m) =>
          calcularSituacao(
            { dataProgramada: paraData(m.dataProgramada), kmLimite: m.kmLimite },
            veiculo.kmAtual,
            contexto.antecedencia,
            contexto.hoje,
          ).situacao,
      );
      return {
        ...veiculo,
        manutencoesPendentes: pendentes.length,
        situacaoManutencao: veiculo.status === 'INATIVO' ? null : piorSituacao(situacoes),
      };
    });
}

export function obter(banco: Banco, id: number): VeiculoDetalhe {
  const veiculo = buscarOuFalhar(banco, id);
  const realizadas = banco.manutencoes.filter((m) => m.veiculoId === id && m.status === 'REALIZADA');
  const motorista = banco.motoristas.find((m) => m.id === veiculo.motoristaId);
  const contexto = contextoAlertas(banco);

  return {
    ...veiculo,
    motorista: motorista
      ? {
          id: motorista.id,
          nome: motorista.nome,
          telefone: motorista.telefone,
          validadeCnh: motorista.validadeCnh,
          ...calcularSituacaoCnh(new Date(motorista.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
        }
      : null,
    custoTotal: realizadas.reduce((soma, m) => soma + Math.round((m.custo ?? 0) * 100), 0) / 100,
    manutencoesRealizadas: realizadas.length,
  };
}

export function criar(banco: Banco, corpo: unknown): Veiculo {
  const dados = veiculoSchema.parse(corpo);
  validarUnicos(banco, dados);
  validarMotorista(banco, dados.motoristaId);

  const veiculo: VeiculoRegistro = { id: novoId(banco, 'veiculos'), ...dados, criadoEm: agora(), atualizadoEm: agora() };
  banco.veiculos.push(veiculo);
  return formatar(banco, veiculo);
}

export function atualizar(banco: Banco, id: number, corpo: unknown): Veiculo {
  const dados = veiculoSchema.parse(corpo);
  const veiculo = buscarOuFalhar(banco, id);
  if (veiculo.status === 'INATIVO') {
    throw new ErroApi('Este veículo está inativo. Reative-o antes de editar.', 400);
  }
  validarUnicos(banco, dados, id);
  validarMotorista(banco, dados.motoristaId, id);

  Object.assign(veiculo, dados, { atualizadoEm: agora() });
  return formatar(banco, veiculo);
}

/** Atualização rápida do hodômetro, base dos alertas por quilometragem (RF03). */
export function atualizarKm(banco: Banco, id: number, corpo: unknown): Veiculo {
  const { kmAtual } = atualizarKmSchema.parse(corpo);
  const veiculo = buscarOuFalhar(banco, id);
  if (veiculo.status === 'INATIVO') throw new ErroApi('Este veículo está inativo.', 400);

  // O hodômetro só avança. Para corrigir um valor digitado errado, use a edição completa.
  if (kmAtual < veiculo.kmAtual) {
    throw erroDeCampo(
      'kmAtual',
      `A quilometragem não pode ser menor que a atual (${veiculo.kmAtual.toLocaleString('pt-BR')} km).`,
    );
  }
  Object.assign(veiculo, { kmAtual, atualizadoEm: agora() });
  return formatar(banco, veiculo);
}

/**
 * Exclusão lógica: o veículo sai das listagens e dos alertas, mas o histórico
 * de manutenções e custos é preservado. O motorista fica livre para outro veículo.
 */
export function inativar(banco: Banco, id: number) {
  const veiculo = buscarOuFalhar(banco, id);
  Object.assign(veiculo, { status: 'INATIVO', motoristaId: null, atualizadoEm: agora() });
}

export function reativar(banco: Banco, id: number): Veiculo {
  const veiculo = buscarOuFalhar(banco, id);
  if (veiculo.status !== 'INATIVO') throw new ErroApi('Este veículo já está ativo.', 400);
  Object.assign(veiculo, { status: 'ATIVO', atualizadoEm: agora() });
  return formatar(banco, veiculo);
}

/** Sem duplicidade de placa, chassi e RENAVAM (RF01). */
function validarUnicos(banco: Banco, dados: Pick<VeiculoRegistro, 'placa' | 'chassi' | 'renavam'>, idAtual?: number) {
  garantirUnico(banco.veiculos, 'placa', dados.placa, 'esta placa', idAtual);
  garantirUnico(banco.veiculos, 'chassi', dados.chassi, 'este chassi', idAtual);
  garantirUnico(banco.veiculos, 'renavam', dados.renavam, 'este RENAVAM', idAtual);
}

/** O motorista precisa estar ativo e não pode ser responsável por outro veículo. */
function validarMotorista(banco: Banco, motoristaId: number | null, veiculoId?: number) {
  if (motoristaId === null) return;

  const motorista = banco.motoristas.find((m) => m.id === motoristaId);
  if (!motorista?.ativo) {
    throw new ErroApi('Motorista não encontrado ou inativo.', 400, { motoristaId: ['Selecione um motorista ativo.'] });
  }
  const outroVeiculo = banco.veiculos.find((v) => v.motoristaId === motoristaId && v.id !== veiculoId);
  if (outroVeiculo) {
    throw erroDeCampo(
      'motoristaId',
      `${motorista.nome} já é responsável pelo veículo ${formatarPlaca(outroVeiculo.placa)}.`,
      409,
    );
  }
}
