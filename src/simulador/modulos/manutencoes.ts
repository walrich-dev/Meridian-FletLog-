// RF03: programação e histórico de manutenções preventivas e corretivas.
import { z } from 'zod';
import type { Manutencao, ResultadoManutencao, StatusManutencao } from '../../lib/tipos';
import { novoId, type Banco, type ManutencaoRegistro, type VeiculoRegistro } from '../banco';
import { ErroApi } from '../erros';
import { calcularSituacao, GRAVIDADE, proximaProgramacao } from '../regras/situacao';
import { data, dataAteHoje, dinheiro, id, inteiro, opcional, texto } from '../regras/validacao';
import { agora, contem, contextoAlertas, paraData, paraIso, type ContextoAlertas } from './comum';
import { buscarOuFalhar as buscarVeiculo } from './veiculos';

const KM_MAXIMO = 5_000_000;
const TIPO = z.enum(['PREVENTIVA', 'CORRETIVA'], { error: 'Selecione o tipo: preventiva ou corretiva.' });

const campos = {
  veiculoId: id,
  tipo: TIPO,
  descricao: texto(255),

  // Programação (critérios dos alertas do RF03)
  dataProgramada: opcional(data),
  kmLimite: opcional(inteiro({ max: KM_MAXIMO })),

  // Recorrência: ao concluir uma preventiva, a próxima é programada com estes intervalos
  intervaloKm: opcional(inteiro({ min: 1, max: 1_000_000 })),
  intervaloDias: opcional(inteiro({ min: 1, max: 3650 })),

  // Execução (preenchidos quando a manutenção é realizada)
  dataRealizacao: opcional(dataAteHoje),
  kmRealizacao: opcional(inteiro({ max: KM_MAXIMO })),
  custo: opcional(dinheiro),
  oficina: opcional(texto(120)),
};

/** Cadastro: programar (PENDENTE) ou registrar um serviço já feito (REALIZADA). */
const criarSchema = z.object({
  ...campos,
  status: z.enum(['PENDENTE', 'REALIZADA'], { error: 'Status inválido.' }).default('PENDENTE'),
});

/** Edição: o status não muda aqui (ver concluir e cancelar). */
const atualizarSchema = z.object(campos);

const concluirSchema = z.object({
  dataRealizacao: dataAteHoje,
  kmRealizacao: opcional(inteiro({ max: KM_MAXIMO })),
  custo: opcional(dinheiro),
  oficina: opcional(texto(120)),
  // Se o veículo estava "em manutenção", volta a ficar ativo
  liberarVeiculo: z.boolean().default(false),
});

const filtrosSchema = z.object({
  veiculoId: id.optional(),
  status: z.enum(['PENDENTE', 'REALIZADA', 'CANCELADA']).optional(),
  tipo: TIPO.optional(),
  situacao: z.enum(['VENCIDA', 'PROXIMA', 'EM_DIA']).optional(),
  busca: z.string().trim().optional(),
});

type DadosManutencao = z.infer<typeof atualizarSchema>;

/** Formato de resposta: dados do veículo e, nas pendentes, a situação calculada (RF03). */
export function formatar(banco: Banco, manutencao: ManutencaoRegistro, contexto: ContextoAlertas): Manutencao {
  const veiculo = buscarVeiculo(banco, manutencao.veiculoId);
  const situacao =
    manutencao.status === 'PENDENTE'
      ? calcularSituacao(
          { dataProgramada: paraData(manutencao.dataProgramada), kmLimite: manutencao.kmLimite },
          veiculo.kmAtual,
          contexto.antecedencia,
          contexto.hoje,
        )
      : { situacao: null, diasRestantes: null, kmRestantes: null };

  const { id, placa, marca, modelo, kmAtual, status } = veiculo;
  return { ...manutencao, veiculo: { id, placa, marca, modelo, kmAtual, status }, ...situacao };
}

const ORDEM_STATUS: Record<StatusManutencao, number> = { PENDENTE: 0, REALIZADA: 1, CANCELADA: 2 };

/** Compara textos ISO deixando os vazios por último. `direcao` 1 = crescente, -1 = decrescente. */
function compararData(a: string | null, b: string | null, direcao: 1 | -1) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -direcao : direcao;
}

/** Pendentes primeiro, das mais graves para as menos graves; depois o histórico, do mais recente. */
function ordenar(a: Manutencao, b: Manutencao) {
  const gravidade = (m: Manutencao) => (m.status !== 'PENDENTE' ? 10 : m.situacao ? GRAVIDADE[m.situacao] : 3);
  return (
    ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
    gravidade(a) - gravidade(b) ||
    compararData(a.dataRealizacao, b.dataRealizacao, -1) ||
    compararData(a.dataProgramada, b.dataProgramada, 1) ||
    b.id - a.id
  );
}

export function listar(banco: Banco, consulta: unknown): Manutencao[] {
  const { veiculoId, status, tipo, situacao, busca } = filtrosSchema.parse(consulta);
  // A situação só existe nas pendentes
  const statusFiltro = situacao ? 'PENDENTE' : status;
  const termoPlaca = busca?.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const contexto = contextoAlertas(banco);

  return banco.manutencoes
    .filter(
      (m) =>
        (veiculoId === undefined || m.veiculoId === veiculoId) &&
        (!statusFiltro || m.status === statusFiltro) &&
        (!tipo || m.tipo === tipo),
    )
    .map((m) => formatar(banco, m, contexto))
    .filter(
      (m) =>
        !busca ||
        contem(m.descricao, busca) ||
        contem(m.oficina, busca) ||
        Boolean(termoPlaca && m.veiculo.placa.includes(termoPlaca)),
    )
    .filter((m) => !situacao || m.situacao === situacao)
    .sort(ordenar);
}

export function obter(banco: Banco, id: number): Manutencao {
  return formatar(banco, buscarOuFalhar(banco, id), contextoAlertas(banco));
}

/** Programa uma manutenção (PENDENTE) ou registra uma já realizada (REALIZADA). */
export function criar(banco: Banco, corpo: unknown): ResultadoManutencao {
  const { status, ...dados } = criarSchema.parse(corpo);
  const veiculo = veiculoDisponivel(banco, dados.veiculoId);
  const valores = aplicarRegras(dados, status);

  const manutencao: ManutencaoRegistro = {
    id: novoId(banco, 'manutencoes'),
    ...paraRegistro(valores),
    status,
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  banco.manutencoes.push(manutencao);
  const proxima = status === 'REALIZADA' ? aposRealizacao(banco, manutencao, veiculo, false) : null;

  const contexto = contextoAlertas(banco);
  return { manutencao: formatar(banco, manutencao, contexto), proxima: proxima && formatar(banco, proxima, contexto) };
}

export function atualizar(banco: Banco, id: number, corpo: unknown): Manutencao {
  const dados = atualizarSchema.parse(corpo);
  const atual = buscarOuFalhar(banco, id);
  if (atual.status === 'CANCELADA') {
    throw new ErroApi('Manutenções canceladas não podem ser editadas.', 400);
  }

  const veiculo =
    dados.veiculoId === atual.veiculoId ? buscarVeiculo(banco, atual.veiculoId) : veiculoDisponivel(banco, dados.veiculoId);
  const valores = aplicarRegras(dados, atual.status);

  Object.assign(atual, paraRegistro(valores), { atualizadoEm: agora() });
  atualizarHodometro(veiculo, atual.kmRealizacao);
  return formatar(banco, atual, contextoAlertas(banco));
}

/**
 * Registra a realização de uma manutenção pendente. Se for uma preventiva
 * recorrente, a próxima é programada automaticamente.
 */
export function concluir(banco: Banco, id: number, corpo: unknown): ResultadoManutencao {
  const { liberarVeiculo, ...execucao } = concluirSchema.parse(corpo);
  const atual = buscarOuFalhar(banco, id);
  if (atual.status !== 'PENDENTE') {
    throw new ErroApi('Somente manutenções pendentes podem ser concluídas.', 400);
  }
  const veiculo = buscarVeiculo(banco, atual.veiculoId);
  if (veiculo.status === 'INATIVO') {
    throw new ErroApi('O veículo desta manutenção está inativo.', 400);
  }

  Object.assign(atual, {
    status: 'REALIZADA',
    dataRealizacao: paraIso(execucao.dataRealizacao),
    kmRealizacao: execucao.kmRealizacao,
    custo: execucao.custo,
    oficina: execucao.oficina ?? atual.oficina,
    atualizadoEm: agora(),
  });
  const proxima = aposRealizacao(banco, atual, veiculo, liberarVeiculo);

  const contexto = contextoAlertas(banco);
  return { manutencao: formatar(banco, atual, contexto), proxima: proxima && formatar(banco, proxima, contexto) };
}

export function cancelar(banco: Banco, id: number): Manutencao {
  const atual = buscarOuFalhar(banco, id);
  if (atual.status !== 'PENDENTE') {
    throw new ErroApi('Somente manutenções pendentes podem ser canceladas.', 400);
  }
  Object.assign(atual, { status: 'CANCELADA', atualizadoEm: agora() });
  return formatar(banco, atual, contextoAlertas(banco));
}

/** Exclui um registro lançado por engano. As realizadas compõem o histórico de custos e não podem ser excluídas. */
export function excluir(banco: Banco, id: number) {
  const atual = buscarOuFalhar(banco, id);
  if (atual.status === 'REALIZADA') {
    throw new ErroApi(
      'Manutenções realizadas fazem parte do histórico de custos e não podem ser excluídas. Corrija os dados pela edição.',
      400,
    );
  }
  banco.manutencoes = banco.manutencoes.filter((m) => m.id !== id);
}

// -----------------------------------------------------------------------------
// Regras auxiliares
// -----------------------------------------------------------------------------

function buscarOuFalhar(banco: Banco, id: number): ManutencaoRegistro {
  const manutencao = banco.manutencoes.find((m) => m.id === id);
  if (!manutencao) throw new ErroApi('Manutenção não encontrada.', 404);
  return manutencao;
}

function veiculoDisponivel(banco: Banco, veiculoId: number): VeiculoRegistro {
  const veiculo = banco.veiculos.find((v) => v.id === veiculoId);
  if (!veiculo) {
    throw new ErroApi('Veículo não encontrado.', 400, { veiculoId: ['Selecione um veículo.'] });
  }
  if (veiculo.status === 'INATIVO') {
    throw new ErroApi('Este veículo está inativo.', 400, { veiculoId: ['Selecione um veículo ativo.'] });
  }
  return veiculo;
}

/** Converte as datas validadas para o formato guardado. */
function paraRegistro({ dataProgramada, dataRealizacao, ...resto }: DadosManutencao) {
  return { ...resto, dataProgramada: paraIso(dataProgramada), dataRealizacao: paraIso(dataRealizacao) };
}

/** Regras que dependem da combinação de campos e do status, com mensagens por campo para o formulário. */
function aplicarRegras(dados: DadosManutencao, status: StatusManutencao): DadosManutencao {
  const semProgramacao = dados.dataProgramada === null && dados.kmLimite === null;
  const erros: Record<string, string[]> = {};

  if (status === 'PENDENTE' && dados.tipo === 'PREVENTIVA' && semProgramacao) {
    const mensagem = 'Na preventiva, informe a data programada, o km limite ou os dois.';
    erros.dataProgramada = [mensagem];
    erros.kmLimite = [mensagem];
  }
  if (status === 'REALIZADA' && dados.dataRealizacao === null) {
    erros.dataRealizacao = ['Informe a data em que o serviço foi realizado.'];
  }
  if (Object.keys(erros).length > 0) {
    throw new ErroApi('Dados inválidos.', 400, erros);
  }

  // Pendente ainda não tem dados de execução
  if (status === 'PENDENTE') {
    return { ...dados, dataRealizacao: null, kmRealizacao: null, custo: null };
  }
  // Preventiva registrada já realizada e sem programação: considera-se programada para o dia em que foi feita
  if (dados.tipo === 'PREVENTIVA' && semProgramacao) {
    return { ...dados, dataProgramada: dados.dataRealizacao };
  }
  return dados;
}

/** O hodômetro do veículo acompanha a quilometragem registrada no serviço (só avança). */
function atualizarHodometro(veiculo: VeiculoRegistro, kmRealizacao: number | null) {
  if (kmRealizacao !== null && kmRealizacao > veiculo.kmAtual) {
    Object.assign(veiculo, { kmAtual: kmRealizacao, atualizadoEm: agora() });
  }
}

/** Efeitos de uma manutenção realizada: hodômetro, liberação do veículo e próxima preventiva. */
function aposRealizacao(
  banco: Banco,
  manutencao: ManutencaoRegistro,
  veiculo: VeiculoRegistro,
  liberarVeiculo: boolean,
): ManutencaoRegistro | null {
  const kmAnterior = veiculo.kmAtual;
  atualizarHodometro(veiculo, manutencao.kmRealizacao);
  if (liberarVeiculo && veiculo.status === 'EM_MANUTENCAO') {
    Object.assign(veiculo, { status: 'ATIVO', atualizadoEm: agora() });
  }

  if (manutencao.tipo !== 'PREVENTIVA' || manutencao.dataRealizacao === null) return null;

  const programacao = proximaProgramacao(manutencao, {
    data: new Date(manutencao.dataRealizacao),
    km: manutencao.kmRealizacao ?? kmAnterior,
  });
  if (!programacao) return null;

  const proxima: ManutencaoRegistro = {
    id: novoId(banco, 'manutencoes'),
    veiculoId: veiculo.id,
    tipo: 'PREVENTIVA',
    descricao: manutencao.descricao,
    status: 'PENDENTE',
    dataProgramada: paraIso(programacao.dataProgramada),
    kmLimite: programacao.kmLimite,
    intervaloKm: manutencao.intervaloKm,
    intervaloDias: manutencao.intervaloDias,
    dataRealizacao: null,
    kmRealizacao: null,
    custo: null,
    oficina: null,
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  banco.manutencoes.push(proxima);
  return proxima;
}
