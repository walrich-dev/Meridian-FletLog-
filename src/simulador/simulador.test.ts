// Testes da API simulada de ponta a ponta: cada teste parte dos dados de
// demonstração, guardados em memória, e faz requisições como o painel faz.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Alertas, Dashboard, Manutencao, ResultadoManutencao, VeiculoListagem } from '../lib/tipos';
import { armazenamentoEmMemoria } from './banco';
import { configurarArmazenamento, requisicaoSimulada } from './index';
import { hoje, textoDeData } from './regras/datas';

let tokenAdmin: string;

function requisicao(metodo: string, caminho: string, corpo?: unknown, token: string | null = tokenAdmin) {
  return requisicaoSimulada(metodo, caminho, corpo, token);
}

function entrar(email: string, senha: string) {
  return requisicao('POST', '/auth/login', { email, senha }, null);
}

beforeEach(() => {
  configurarArmazenamento(armazenamentoEmMemoria());
  tokenAdmin = (entrar('admin@meridian.local', 'Frota@2026').corpo as { token: string }).token;
});

describe('Autenticação (RNF01)', () => {
  it('entra com e-mail (sem diferenciar maiúsculas) e senha corretos', () => {
    const resposta = entrar(' ADMIN@meridian.local ', 'Frota@2026');
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({ token: expect.any(String), usuario: { perfil: 'ADMIN' } });
    expect(JSON.stringify(resposta.corpo)).not.toContain('senhaHash');
  });

  it('recusa senha errada e e-mail inexistente com a mesma mensagem', () => {
    const senhaErrada = entrar('admin@meridian.local', 'errada');
    const emailInexistente = entrar('ninguem@x.com', 'Frota@2026');
    expect(senhaErrada.status).toBe(401);
    expect(emailInexistente.status).toBe(401);
    expect(senhaErrada.corpo).toEqual(emailInexistente.corpo);
  });

  it('exige login nas rotas protegidas', () => {
    expect(requisicao('GET', '/veiculos', undefined, null).status).toBe(401);
    expect(requisicao('GET', '/veiculos', undefined, 'token-falso').status).toBe(401);
    expect(requisicao('GET', '/auth/me').corpo).toMatchObject({ email: 'admin@meridian.local' });
  });

  it('encerra a sessão ao sair', () => {
    expect(requisicao('POST', '/auth/logout').status).toBe(204);
    expect(requisicao('GET', '/auth/me').status).toBe(401);
  });

  it('restringe a gestão de usuários e das configurações ao ADMIN', () => {
    const tokenGestor = (entrar('gestor@meridian.local', 'Gestor@2026').corpo as { token: string }).token;
    expect(requisicao('GET', '/usuarios', undefined, tokenGestor).status).toBe(403);
    expect(requisicao('PUT', '/configuracoes', { alertaAntecedenciaKm: 1, alertaAntecedenciaDias: 1 }, tokenGestor).status).toBe(403);
    expect(requisicao('GET', '/configuracoes', undefined, tokenGestor).status).toBe(200);
  });

  it('derruba na hora a sessão de um usuário inativado', () => {
    const tokenGestor = (entrar('gestor@meridian.local', 'Gestor@2026').corpo as { token: string }).token;
    requisicao('PUT', '/usuarios/2', { nome: 'Gestor de Frota', email: 'gestor@meridian.local', perfil: 'GESTOR', ativo: false });

    expect(requisicao('GET', '/veiculos', undefined, tokenGestor).status).toBe(401);
    expect(entrar('gestor@meridian.local', 'Gestor@2026').status).toBe(403);
  });
});

describe('Veículos (RF01)', () => {
  const novoVeiculo = {
    placa: 'abc-1234',
    marca: 'Ford',
    modelo: 'Cargo 816',
    chassi: '9bfzzz1234567890a',
    renavam: '987654321',
    anoAquisicao: '2024',
    kmAtual: '1000',
  };

  it('cadastra normalizando os documentos', () => {
    const resposta = requisicao('POST', '/veiculos', novoVeiculo);
    expect(resposta.status).toBe(201);
    expect(resposta.corpo).toMatchObject({ placa: 'ABC1234', chassi: '9BFZZZ1234567890A', renavam: '00987654321', kmAtual: 1000 });
  });

  it('bloqueia placa duplicada, apontando o campo', () => {
    const resposta = requisicao('POST', '/veiculos', { ...novoVeiculo, placa: 'rta-1b23' });
    expect(resposta.status).toBe(409);
    expect(resposta.corpo).toMatchObject({ detalhes: { placa: ['Já existe um cadastro com esta placa.'] } });
  });

  it('não deixa um motorista ser responsável por dois veículos', () => {
    const resposta = requisicao('POST', '/veiculos', { ...novoVeiculo, motoristaId: 1 });
    expect(resposta.status).toBe(409);
    expect(resposta.corpo).toMatchObject({ mensagem: 'Ana Paula Souza já é responsável pelo veículo RTA1B23.' });
  });

  it('não grava nada quando a requisição falha (como uma transação)', () => {
    const antes = (requisicao('GET', '/veiculos').corpo as unknown[]).length;
    requisicao('POST', '/veiculos', { ...novoVeiculo, chassi: 'invalido' });
    expect((requisicao('GET', '/veiculos').corpo as unknown[]).length).toBe(antes);
  });

  it('não deixa o hodômetro voltar', () => {
    const resposta = requisicao('PATCH', '/veiculos/1/km', { kmAtual: 100 });
    expect(resposta.status).toBe(400);
    expect(resposta.corpo).toMatchObject({ detalhes: { kmAtual: [expect.stringContaining('49.420 km')] } });
  });

  it('inativa (exclusão lógica) liberando o motorista e tirando o veículo dos alertas', () => {
    expect(requisicao('DELETE', '/veiculos/5').status).toBe(204);

    const ativos = requisicao('GET', '/veiculos').corpo as VeiculoListagem[];
    const inativos = requisicao('GET', '/veiculos?status=INATIVO').corpo as VeiculoListagem[];
    const alertas = requisicao('GET', '/alertas').corpo as Alertas;
    expect(ativos.map((v) => v.placa)).not.toContain('GHJ5K67');
    expect(inativos.map((v) => v.placa)).toContain('GHJ5K67');
    expect(alertas.manutencoes.map((m) => m.veiculo.placa)).not.toContain('GHJ5K67');
  });
});

describe('Motoristas (RF01)', () => {
  it('valida CPF e bloqueia CPF duplicado', () => {
    const invalido = requisicao('POST', '/motoristas', {
      nome: 'Fulano',
      cpf: '111.111.111-11',
      cnh: '12345678901',
      categoriaCnh: 'B',
      validadeCnh: '2028-01-01',
    });
    const duplicado = requisicao('POST', '/motoristas', {
      nome: 'Fulano',
      cpf: '529.982.247-25',
      cnh: '12345678901',
      categoriaCnh: 'B',
      validadeCnh: '2028-01-01',
    });
    expect(invalido.corpo).toMatchObject({ detalhes: { cpf: ['CPF inválido.'] } });
    expect(duplicado.status).toBe(409);
  });

  it('ao inativar, desvincula do veículo', () => {
    requisicao('DELETE', '/motoristas/1');
    expect(requisicao('GET', '/veiculos/1').corpo).toMatchObject({ motorista: null });
  });
});

describe('Manutenções e alertas (RF03)', () => {
  it('gera os alertas dos dados de demonstração', () => {
    const { resumo } = requisicao('GET', '/alertas').corpo as Alertas;
    expect(resumo).toMatchObject({ manutencoesVencidas: 2, manutencoesProximas: 3, cnhVencidas: 1, cnhVencendo: 1 });
  });

  it('exige data ou km na preventiva pendente', () => {
    const resposta = requisicao('POST', '/manutencoes', { veiculoId: 1, tipo: 'PREVENTIVA', descricao: 'Teste' });
    expect(resposta.status).toBe(400);
    expect(resposta.corpo).toMatchObject({ detalhes: { dataProgramada: [expect.any(String)], kmLimite: [expect.any(String)] } });
  });

  it('ao concluir uma preventiva recorrente, programa a próxima e atualiza o hodômetro', () => {
    const [alinhamento] = requisicao('GET', '/manutencoes?veiculoId=3&situacao=VENCIDA').corpo as Manutencao[];
    const resposta = requisicao('POST', `/manutencoes/${alinhamento.id}/concluir`, {
      dataRealizacao: textoDeData(hoje()),
      kmRealizacao: '133000',
      custo: '350,00',
      liberarVeiculo: true,
    });

    const { manutencao, proxima } = resposta.corpo as ResultadoManutencao;
    expect(manutencao).toMatchObject({ status: 'REALIZADA', custo: 350, situacao: null });
    expect(proxima).toMatchObject({ status: 'PENDENTE', kmLimite: 143_000, situacao: 'EM_DIA' });
    expect(requisicao('GET', '/veiculos/3').corpo).toMatchObject({ kmAtual: 133_000, status: 'ATIVO' });
  });

  it('não exclui manutenção realizada (histórico de custos)', () => {
    const [realizada] = requisicao('GET', '/manutencoes?status=REALIZADA').corpo as Manutencao[];
    expect(requisicao('DELETE', `/manutencoes/${realizada.id}`).status).toBe(400);
  });

  it('a antecedência configurada muda a situação calculada', () => {
    requisicao('PUT', '/configuracoes', { alertaAntecedenciaKm: 0, alertaAntecedenciaDias: 0 });
    const { resumo } = requisicao('GET', '/alertas').corpo as Alertas;
    expect(resumo.manutencoesProximas).toBe(0);
    expect(resumo.manutencoesVencidas).toBe(2);
  });
});

describe('Dashboard (RF02)', () => {
  it('resume a frota e os custos', () => {
    const { frota, custos, manutencoes } = requisicao('GET', '/dashboard').corpo as Dashboard;
    expect(frota).toMatchObject({ veiculos: 5, ativos: 4, emManutencao: 1, semMotorista: 1, motoristasAtivos: 5 });
    expect(custos.porMes).toHaveLength(12);
    expect(manutencoes).toMatchObject({ vencidas: 2, proximas: 3 });
  });
});

describe('Demonstração', () => {
  it('restaura os dados iniciais sem deslogar o administrador', () => {
    requisicao('DELETE', '/veiculos/1');
    expect(requisicao('POST', '/demonstracao/restaurar').status).toBe(204);
    expect((requisicao('GET', '/veiculos').corpo as unknown[]).length).toBe(5);
  });
});
