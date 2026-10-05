// RF01: cadastro, consulta, edição e exclusão (lógica) de motoristas.
import { z } from 'zod';
import type { Motorista } from '../../lib/tipos';
import { novoId, type Banco, type MotoristaRegistro } from '../banco';
import { ErroApi } from '../erros';
import { somenteDigitos } from '../regras/documentos';
import { calcularSituacaoCnh } from '../regras/situacao';
import { cnh, cpf, data, opcional, telefone, texto } from '../regras/validacao';
import { agora, contem, contextoAlertas, garantirUnico, ordemAlfabetica, paraIso, type ContextoAlertas } from './comum';

const motoristaSchema = z.object({
  nome: texto(120),
  cpf,
  cnh,
  categoriaCnh: z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'], { error: 'Selecione a categoria da CNH.' }),
  validadeCnh: data,
  telefone: opcional(telefone),
});

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  // ?ativo=false lista os inativos (excluídos)
  ativo: z
    .enum(['true', 'false'])
    .default('true')
    .transform((valor) => valor === 'true'),
});

function formatar(banco: Banco, motorista: MotoristaRegistro, contexto: ContextoAlertas): Motorista {
  const veiculo = banco.veiculos.find((v) => v.motoristaId === motorista.id);
  return {
    ...motorista,
    veiculo: veiculo ? { id: veiculo.id, placa: veiculo.placa, modelo: veiculo.modelo } : null,
    ...calcularSituacaoCnh(new Date(motorista.validadeCnh), contexto.antecedencia.dias, contexto.hoje),
  };
}

function buscarOuFalhar(banco: Banco, id: number): MotoristaRegistro {
  const motorista = banco.motoristas.find((m) => m.id === id);
  if (!motorista) throw new ErroApi('Motorista não encontrado.', 404);
  return motorista;
}

export function listar(banco: Banco, consulta: unknown): Motorista[] {
  const { busca, ativo } = filtrosSchema.parse(consulta);
  const digitos = busca ? somenteDigitos(busca) : '';
  const contexto = contextoAlertas(banco);

  return banco.motoristas
    .filter((motorista) => motorista.ativo === ativo)
    .filter(
      (motorista) =>
        !busca ||
        contem(motorista.nome, busca) ||
        (digitos !== '' && (motorista.cpf.includes(digitos) || motorista.cnh.includes(digitos))),
    )
    .sort((a, b) => ordemAlfabetica(a.nome, b.nome))
    .map((motorista) => formatar(banco, motorista, contexto));
}

export function obter(banco: Banco, id: number): Motorista {
  return formatar(banco, buscarOuFalhar(banco, id), contextoAlertas(banco));
}

export function criar(banco: Banco, corpo: unknown): Motorista {
  const { validadeCnh, ...dados } = motoristaSchema.parse(corpo);
  validarUnicos(banco, dados);

  const motorista: MotoristaRegistro = {
    id: novoId(banco, 'motoristas'),
    ...dados,
    validadeCnh: paraIso(validadeCnh) ?? '',
    ativo: true,
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  banco.motoristas.push(motorista);
  return formatar(banco, motorista, contextoAlertas(banco));
}

export function atualizar(banco: Banco, id: number, corpo: unknown): Motorista {
  const { validadeCnh, ...dados } = motoristaSchema.parse(corpo);
  const motorista = buscarOuFalhar(banco, id);
  if (!motorista.ativo) {
    throw new ErroApi('Este motorista está inativo. Reative-o antes de editar.', 400);
  }
  validarUnicos(banco, dados, id);

  Object.assign(motorista, dados, { validadeCnh: paraIso(validadeCnh) ?? '', atualizadoEm: agora() });
  return formatar(banco, motorista, contextoAlertas(banco));
}

/**
 * Exclusão lógica: o motorista sai das listagens e deixa de ser responsável
 * pelo veículo, mas o cadastro é mantido.
 */
export function inativar(banco: Banco, id: number) {
  const motorista = buscarOuFalhar(banco, id);
  for (const veiculo of banco.veiculos.filter((v) => v.motoristaId === id)) {
    Object.assign(veiculo, { motoristaId: null, atualizadoEm: agora() });
  }
  Object.assign(motorista, { ativo: false, atualizadoEm: agora() });
}

export function reativar(banco: Banco, id: number): Motorista {
  const motorista = buscarOuFalhar(banco, id);
  if (motorista.ativo) throw new ErroApi('Este motorista já está ativo.', 400);
  Object.assign(motorista, { ativo: true, atualizadoEm: agora() });
  return formatar(banco, motorista, contextoAlertas(banco));
}

/** Sem duplicidade de CPF e CNH (RF01). */
function validarUnicos(banco: Banco, dados: Pick<MotoristaRegistro, 'cpf' | 'cnh'>, idAtual?: number) {
  garantirUnico(banco.motoristas, 'cpf', dados.cpf, 'este CPF', idAtual);
  garantirUnico(banco.motoristas, 'cnh', dados.cnh, 'esta CNH', idAtual);
}
