// Testes da API e das regras de negócio, contra um banco PostgreSQL de verdade.
//
// O banco de teste (meridian_teste) é recriado antes de cada teste, para que um
// não interfira no outro.
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { ehMesmaOrigem } from '../app.js';
import { pool } from '../banco.js';
import { ADMIN, encerrar, entrar, GESTOR, hojeTexto, iniciarApi, pedir, prepararBanco } from './ajuda.js';

let token = '';

beforeAll(prepararBanco);
beforeEach(async () => {
  await prepararBanco();
  token = await entrar(ADMIN.email, ADMIN.senha);
});
afterAll(encerrar);

// -----------------------------------------------------------------------------
describe('Autenticação (RNF01)', () => {
  it('entra com e-mail (sem diferenciar maiúsculas) e senha corretos', async () => {
    const { status, corpo } = await pedir('POST', '/auth/login', {
      corpo: { email: '  ADMIN@meridian.local  ', senha: ADMIN.senha },
    });
    expect(status).toBe(200);
    expect(corpo.usuario).toMatchObject({ email: ADMIN.email, perfil: 'ADMIN' });
    expect(corpo.token).toHaveLength(64);
  });

  it('recusa senha errada e e-mail inexistente com a mesma mensagem', async () => {
    const senhaErrada = await pedir('POST', '/auth/login', { corpo: { email: ADMIN.email, senha: 'errada' } });
    const semCadastro = await pedir('POST', '/auth/login', { corpo: { email: 'ninguem@x.com', senha: 'Frota@2026' } });
    expect(senhaErrada.status).toBe(401);
    expect(semCadastro.status).toBe(401);
    expect(senhaErrada.corpo.mensagem).toBe(semCadastro.corpo.mensagem);
  });

  it('exige login nas rotas protegidas', async () => {
    expect((await pedir('GET', '/veiculos')).status).toBe(401);
    expect((await pedir('GET', '/dashboard')).status).toBe(401);
  });

  it('encerra a sessão ao sair', async () => {
    expect((await pedir('POST', '/auth/logout', { token })).status).toBe(204);
    expect((await pedir('GET', '/auth/me', { token })).status).toBe(401);
  });

  it('restringe a gestão de usuários e as configurações ao ADMIN', async () => {
    const gestor = await entrar(GESTOR.email, GESTOR.senha);
    expect((await pedir('GET', '/usuarios', { token: gestor })).status).toBe(403);
    expect((await pedir('GET', '/veiculos', { token: gestor })).status).toBe(200);

    const configuracao = { alertaAntecedenciaKm: 800, alertaAntecedenciaDias: 20 };
    expect((await pedir('PUT', '/configuracoes', { token: gestor, corpo: configuracao })).status).toBe(403);
    expect((await pedir('PUT', '/configuracoes', { token, corpo: configuracao })).status).toBe(200);
  });

  it('derruba na hora a sessão de um usuário inativado (RN10)', async () => {
    const gestor = await entrar(GESTOR.email, GESTOR.senha);
    expect((await pedir('GET', '/veiculos', { token: gestor })).status).toBe(200);

    await pedir('PUT', '/usuarios/2', {
      token,
      corpo: { nome: 'Rafael Alves', email: GESTOR.email, perfil: 'GESTOR', ativo: false },
    });

    // A sessão aberta é apagada, então o token deixa de valer
    expect((await pedir('GET', '/veiculos', { token: gestor })).status).toBe(401);
    // E entrar de novo é recusado, com a explicação do motivo
    const novoLogin = await pedir('POST', '/auth/login', { corpo: GESTOR });
    expect(novoLogin.status).toBe(403);
    expect(novoLogin.corpo.mensagem).toContain('inativo');
  });

  it('troca a senha e passa a exigir a nova', async () => {
    const troca = await pedir('PUT', '/auth/senha', {
      token,
      corpo: { senhaAtual: ADMIN.senha, novaSenha: 'NovaSenha@2026' },
    });
    expect(troca.status).toBe(204);
    expect((await pedir('POST', '/auth/login', { corpo: ADMIN })).status).toBe(401);
    expect(
      (await pedir('POST', '/auth/login', { corpo: { email: ADMIN.email, senha: 'NovaSenha@2026' } })).status,
    ).toBe(200);
  });

  it('não impede o administrador de inativar a si mesmo por engano', async () => {
    const { status, corpo } = await pedir('PUT', '/usuarios/1', {
      token,
      corpo: { nome: 'Mariana Costa', email: ADMIN.email, perfil: 'ADMIN', ativo: false },
    });
    expect(status).toBe(400);
    expect(corpo.detalhes.ativo).toBeDefined();
  });

  it('guarda a senha como hash, nunca em texto puro', async () => {
    const { rows } = await pool.query<{ senhaHash: string }>(
      'SELECT senha_hash AS "senhaHash" FROM usuarios WHERE email = $1',
      [ADMIN.email],
    );
    expect(rows[0]!.senhaHash).not.toContain(ADMIN.senha);
    expect(rows[0]!.senhaHash.startsWith('$2')).toBe(true); // formato do bcrypt
  });
});

// -----------------------------------------------------------------------------
describe('Veículos (RF01)', () => {
  const novoVeiculo = {
    placa: 'abc-1d23',
    marca: 'Ford',
    modelo: 'Cargo 816',
    chassi: '9bwzzz377vt004321',
    renavam: '123456789',
    anoAquisicao: 2021,
    kmAtual: 1000,
  };

  it('cadastra normalizando os documentos', async () => {
    const { status, corpo } = await pedir('POST', '/veiculos', { token, corpo: novoVeiculo });
    expect(status).toBe(201);
    // A placa vira maiúscula e sem hífen; o RENAVAM de 9 dígitos é completado com zeros
    expect(corpo).toMatchObject({ placa: 'ABC1D23', chassi: '9BWZZZ377VT004321', renavam: '00123456789' });
  });

  it('bloqueia placa duplicada, apontando o campo (RN08)', async () => {
    const { status, corpo } = await pedir('POST', '/veiculos', {
      token,
      corpo: { ...novoVeiculo, placa: 'RTA1B23' },
    });
    expect(status).toBe(409);
    expect(corpo.detalhes.placa).toBeDefined();
  });

  it('não deixa um motorista ser responsável por dois veículos', async () => {
    const { status, corpo } = await pedir('POST', '/veiculos', {
      token,
      corpo: { ...novoVeiculo, motoristaId: 1 },
    });
    expect(status).toBe(409);
    expect(corpo.detalhes.motoristaId).toBeDefined();
  });

  it('não grava nada quando a requisição falha (transação)', async () => {
    const antes = await pool.query('SELECT COUNT(*) FROM veiculos');
    // Placa válida, mas chassi já usado: a inserção precisa ser desfeita por completo
    await pedir('POST', '/veiculos', {
      token,
      corpo: { ...novoVeiculo, chassi: '9BM979076NB100001' },
    });
    const depois = await pool.query('SELECT COUNT(*) FROM veiculos');
    expect(depois.rows[0].count).toBe(antes.rows[0].count);
  });

  it('não deixa o hodômetro voltar (RN05)', async () => {
    const { corpo: veiculo } = await pedir('GET', '/veiculos/1', { token });
    const { status, corpo } = await pedir('PATCH', '/veiculos/1/km', {
      token,
      corpo: { kmAtual: veiculo.kmAtual - 1 },
    });
    expect(status).toBe(400);
    expect(corpo.detalhes.kmAtual).toBeDefined();

    const avanco = await pedir('PATCH', '/veiculos/1/km', { token, corpo: { kmAtual: veiculo.kmAtual + 500 } });
    expect(avanco.status).toBe(200);
    expect(avanco.corpo.kmAtual).toBe(veiculo.kmAtual + 500);
  });

  it('inativa (exclusão lógica) liberando o motorista e saindo dos alertas (RN06)', async () => {
    const { corpo: antes } = await pedir('GET', '/veiculos/1', { token });
    expect(antes.motorista).not.toBeNull();

    expect((await pedir('DELETE', '/veiculos/1', { token })).status).toBe(204);

    const { corpo: depois } = await pedir('GET', '/veiculos/1', { token });
    expect(depois.status).toBe('INATIVO');
    expect(depois.motorista).toBeNull();
    // O histórico de custos é preservado
    expect(depois.manutencoesRealizadas).toBeGreaterThan(0);

    const { corpo: alertas } = await pedir('GET', '/alertas', { token });
    expect(alertas.manutencoes.some((m: { veiculoId: number }) => m.veiculoId === 1)).toBe(false);

    const { corpo: lista } = await pedir('GET', '/veiculos', { token });
    expect(lista.some((v: { id: number }) => v.id === 1)).toBe(false);

    expect((await pedir('POST', '/veiculos/1/reativar', { token })).corpo.status).toBe('ATIVO');
  });
});

// -----------------------------------------------------------------------------
describe('Motoristas (RF01)', () => {
  const novoMotorista = {
    nome: 'Fernanda Rocha',
    cpf: '529.982.247-25',
    cnh: '09876543210',
    categoriaCnh: 'B',
    validadeCnh: '2029-05-10',
    telefone: '(61) 99999-0000',
  };

  it('valida o CPF e bloqueia CPF duplicado (RN08)', async () => {
    const invalido = await pedir('POST', '/motoristas', {
      token,
      corpo: { ...novoMotorista, cpf: '111.111.111-11' },
    });
    expect(invalido.status).toBe(400);
    expect(invalido.corpo.detalhes.cpf).toBeDefined();

    // 52998224725 já é o CPF da Ana Paula nos dados de demonstração
    const duplicado = await pedir('POST', '/motoristas', { token, corpo: novoMotorista });
    expect(duplicado.status).toBe(409);
    expect(duplicado.corpo.detalhes.cpf).toBeDefined();
  });

  it('aceita documentos com pontuação e guarda só os dígitos', async () => {
    const { status, corpo } = await pedir('POST', '/motoristas', {
      token,
      corpo: { ...novoMotorista, cpf: '123.456.789-09' },
    });
    expect(status).toBe(201);
    expect(corpo).toMatchObject({ cpf: '12345678909', telefone: '61999990000' });
  });

  it('ao inativar, desvincula do veículo (RN06)', async () => {
    const { corpo: antes } = await pedir('GET', '/motoristas/1', { token });
    expect(antes.veiculo).not.toBeNull();

    expect((await pedir('DELETE', '/motoristas/1', { token })).status).toBe(204);

    const { corpo: veiculo } = await pedir('GET', `/veiculos/${antes.veiculo.id}`, { token });
    expect(veiculo.motorista).toBeNull();

    const { corpo: inativos } = await pedir('GET', '/motoristas?ativo=false', { token });
    expect(inativos.some((m: { id: number }) => m.id === 1)).toBe(true);
  });

  it('classifica a situação da CNH (RN09)', async () => {
    const { corpo } = await pedir('GET', '/motoristas', { token });
    const situacoes = corpo.map((m: { situacaoCnh: string }) => m.situacaoCnh);
    expect(situacoes).toContain('VENCIDA');
    expect(situacoes).toContain('VENCENDO');
    expect(situacoes).toContain('VALIDA');
  });
});

// -----------------------------------------------------------------------------
describe('Manutenções e alertas (RF03)', () => {
  it('gera os alertas dos dados de demonstração', async () => {
    const { corpo } = await pedir('GET', '/alertas', { token });
    expect(corpo.resumo.manutencoesVencidas).toBeGreaterThan(0);
    expect(corpo.resumo.manutencoesProximas).toBeGreaterThan(0);
    expect(corpo.resumo.cnhVencidas).toBeGreaterThan(0);
    expect(corpo.resumo.cnhVencendo).toBeGreaterThan(0);
    // As vencidas vêm antes das próximas
    const situacoes = corpo.manutencoes.map((m: { situacao: string }) => m.situacao);
    expect(situacoes.lastIndexOf('VENCIDA')).toBeLessThan(situacoes.indexOf('PROXIMA'));
  });

  it('exige data ou km na preventiva pendente (RN04)', async () => {
    const { status, corpo } = await pedir('POST', '/manutencoes', {
      token,
      corpo: { veiculoId: 1, tipo: 'PREVENTIVA', descricao: 'Sem programação' },
    });
    expect(status).toBe(400);
    expect(corpo.detalhes.dataProgramada).toBeDefined();
    expect(corpo.detalhes.kmLimite).toBeDefined();
  });

  it('ao concluir uma preventiva recorrente, programa a próxima e atualiza o hodômetro (RN03)', async () => {
    // Manutenção 11: alinhamento do QWE3F45, a cada 10.000 km
    const { corpo: antes } = await pedir('GET', '/manutencoes/11', { token });
    expect(antes.intervaloKm).toBe(10_000);

    const { status, corpo } = await pedir('POST', '/manutencoes/11/concluir', {
      token,
      corpo: { dataRealizacao: hojeTexto(), kmRealizacao: 132_400, custo: '480,00', oficina: 'Oficina Teste' },
    });

    expect(status).toBe(200);
    expect(corpo.manutencao.status).toBe('REALIZADA');
    expect(corpo.manutencao.custo).toBe(480);
    // A próxima é programada a partir do km do serviço
    expect(corpo.proxima.kmLimite).toBe(142_400);
    expect(corpo.proxima.status).toBe('PENDENTE');
    expect(corpo.proxima.descricao).toBe(antes.descricao);

    // O hodômetro do veículo acompanha a quilometragem do serviço
    const { corpo: veiculo } = await pedir('GET', `/veiculos/${antes.veiculoId}`, { token });
    expect(veiculo.kmAtual).toBe(132_400);
  });

  it('não conclui duas vezes a mesma manutenção', async () => {
    const corpo = { dataRealizacao: hojeTexto(), kmRealizacao: 132_400 };
    expect((await pedir('POST', '/manutencoes/11/concluir', { token, corpo })).status).toBe(200);
    expect((await pedir('POST', '/manutencoes/11/concluir', { token, corpo })).status).toBe(400);
  });

  it('não exclui manutenção realizada, preservando o histórico (RN07)', async () => {
    const { corpo: lista } = await pedir('GET', '/manutencoes?status=REALIZADA', { token });
    const realizada = lista[0];

    const { status } = await pedir('DELETE', `/manutencoes/${realizada.id}`, { token });
    expect(status).toBe(400);

    // Uma pendente pode ser excluída
    const { corpo: pendentes } = await pedir('GET', '/manutencoes?status=PENDENTE', { token });
    expect((await pedir('DELETE', `/manutencoes/${pendentes[0].id}`, { token })).status).toBe(204);
  });

  it('recusa data de realização no futuro (RN04)', async () => {
    const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const { status, corpo } = await pedir('POST', '/manutencoes/11/concluir', {
      token,
      corpo: { dataRealizacao: amanha, kmRealizacao: 133_000 },
    });
    expect(status).toBe(400);
    expect(corpo.detalhes.dataRealizacao).toBeDefined();
  });

  it('a antecedência configurada muda a situação calculada (RN02)', async () => {
    const antes = await pedir('GET', '/alertas', { token });

    await pedir('PUT', '/configuracoes', {
      token,
      corpo: { alertaAntecedenciaKm: 50_000, alertaAntecedenciaDias: 365 },
    });

    const depois = await pedir('GET', '/alertas', { token });
    expect(depois.corpo.manutencoes.length).toBeGreaterThan(antes.corpo.manutencoes.length);
  });

  it('cancela uma pendente e impede editá-la depois', async () => {
    expect((await pedir('POST', '/manutencoes/11/cancelar', { token })).corpo.status).toBe('CANCELADA');

    const { status } = await pedir('PUT', '/manutencoes/11', {
      token,
      corpo: { veiculoId: 2, tipo: 'PREVENTIVA', descricao: 'Nova descrição', kmLimite: 140_000 },
    });
    expect(status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
describe('Dashboard (RF02)', () => {
  it('resume a frota, a quilometragem e os custos', async () => {
    const { corpo } = await pedir('GET', '/dashboard', { token });

    // Os 6 veículos da demonstração, menos o inativo
    expect(corpo.frota).toMatchObject({ veiculos: 5, ativos: 4, emManutencao: 1, motoristasAtivos: 5 });
    expect(corpo.quilometragem.total).toBeGreaterThan(0);
    expect(corpo.quilometragem.media).toBe(Math.round(corpo.quilometragem.total / corpo.frota.veiculos));

    // Doze meses no gráfico, mesmo os sem gasto
    expect(corpo.custos.porMes).toHaveLength(12);
    expect(corpo.custos.ultimos12Meses).toBeGreaterThan(0);
    expect(corpo.custos.porTipo.PREVENTIVA + corpo.custos.porTipo.CORRETIVA).toBeCloseTo(
      corpo.custos.ultimos12Meses,
      2,
    );

    expect(corpo.manutencoes.vencidas).toBeGreaterThan(0);
  });

  it('mantém no histórico os custos de veículos já inativados (RN06)', async () => {
    const antes = await pedir('GET', '/dashboard', { token });
    await pedir('DELETE', '/veiculos/1', { token });
    const depois = await pedir('GET', '/dashboard', { token });

    expect(depois.corpo.frota.veiculos).toBe(antes.corpo.frota.veiculos - 1);
    expect(depois.corpo.custos.ultimos12Meses).toBe(antes.corpo.custos.ultimos12Meses);
  });
});

// -----------------------------------------------------------------------------
describe('Filtros e busca', () => {
  it('busca veículos por placa, marca e motorista, ignorando acentos', async () => {
    const porPlaca = await pedir('GET', '/veiculos?busca=rta-1b23', { token });
    expect(porPlaca.corpo).toHaveLength(1);
    expect(porPlaca.corpo[0].placa).toBe('RTA1B23');

    const porMarca = await pedir('GET', '/veiculos?busca=mercedes', { token });
    expect(porMarca.corpo.length).toBeGreaterThan(0);

    // "ana paula" sem acento encontra a motorista responsável
    const porMotorista = await pedir('GET', '/veiculos?busca=Ana Paula', { token });
    expect(porMotorista.corpo.length).toBeGreaterThan(0);
  });

  it('filtra manutenções por veículo, status e situação', async () => {
    const porVeiculo = await pedir('GET', '/manutencoes?veiculoId=1', { token });
    expect(porVeiculo.corpo.every((m: { veiculoId: number }) => m.veiculoId === 1)).toBe(true);

    const pendentes = await pedir('GET', '/manutencoes?status=PENDENTE', { token });
    expect(pendentes.corpo.every((m: { status: string }) => m.status === 'PENDENTE')).toBe(true);

    const vencidas = await pedir('GET', '/manutencoes?situacao=VENCIDA', { token });
    expect(vencidas.corpo.length).toBeGreaterThan(0);
    expect(vencidas.corpo.every((m: { situacao: string }) => m.situacao === 'VENCIDA')).toBe(true);
  });
});

// -----------------------------------------------------------------------------
describe('Restauração dos dados de demonstração', () => {
  it('apaga as alterações e recria a frota, sem deslogar quem restaurou', async () => {
    await pedir('POST', '/veiculos', {
      token,
      corpo: {
        placa: 'TST1A11',
        marca: 'Teste',
        modelo: 'Modelo',
        chassi: '9TST4X20003456789',
        renavam: '00111222333',
        anoAquisicao: 2024,
        kmAtual: 100,
      },
    });

    const { status } = await pedir('POST', '/demonstracao/restaurar', { token });
    expect(status).toBe(204);

    // O veículo de teste desapareceu e a frota voltou ao estado inicial
    const { corpo: veiculos } = await pedir('GET', '/veiculos', { token });
    expect(veiculos.some((v: { placa: string }) => v.placa === 'TST1A11')).toBe(false);
    expect(veiculos).toHaveLength(5);

    // E a sessão de quem restaurou continua valendo
    expect((await pedir('GET', '/auth/me', { token })).status).toBe(200);
  });

  it('é restrita ao ADMIN', async () => {
    const gestor = await entrar(GESTOR.email, GESTOR.senha);
    expect((await pedir('POST', '/demonstracao/restaurar', { token: gestor })).status).toBe(403);
  });
});

// -----------------------------------------------------------------------------
describe('Respostas da API', () => {
  it('informa que a API e o banco estão no ar', async () => {
    const { status, corpo } = await pedir('GET', '/health');
    expect(status).toBe(200);
    expect(corpo).toMatchObject({ status: 'ok', banco: 'conectado' });
  });

  it('autoriza o painel em qualquer porta de localhost durante o desenvolvimento (CORS)', async () => {
    // O Vite muda de porta sozinho quando a 5173 está ocupada
    for (const origem of ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:4000']) {
      const resposta = await fetch(`${await iniciarApi()}/health`, { headers: { Origin: origem } });
      expect(resposta.headers.get('access-control-allow-origin')).toBe(origem);
    }
  });

  it('envia os cabeçalhos de segurança do helmet', async () => {
    const resposta = await fetch((await iniciarApi()) + '/health');
    // Impede o navegador de adivinhar o tipo do conteúdo
    expect(resposta.headers.get('x-content-type-options')).toBe('nosniff');
    // Impede o painel de ser aberto dentro de um iframe de outro site
    expect(resposta.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    // Não vaza o endereço interno da API para outros sites
    expect(resposta.headers.get('referrer-policy')).toBe('no-referrer');
    // Não anuncia que o servidor é Express
    expect(resposta.headers.get('x-powered-by')).toBeNull();
  });

  it('recusa um site qualquer que tente usar a API (CORS)', async () => {
    const resposta = await fetch((await iniciarApi()) + '/health', {
      headers: { Origin: 'https://site-de-terceiros.example' },
    });
    expect(resposta.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('reconhece a própria origem, para quando a API serve o painel (SERVIR_PAINEL)', () => {
    // Mesmo host: é a nossa página chamando a nossa API
    expect(ehMesmaOrigem('https://meridian.trycloudflare.com', 'meridian.trycloudflare.com')).toBe(true);
    expect(ehMesmaOrigem('http://localhost:3333', 'localhost:3333')).toBe(true);
    // Host diferente, porta diferente ou lixo: não é
    expect(ehMesmaOrigem('https://outro.example', 'meridian.trycloudflare.com')).toBe(false);
    expect(ehMesmaOrigem('http://localhost:3333', 'localhost:5173')).toBe(false);
    expect(ehMesmaOrigem('nao-e-uma-url', 'localhost:3333')).toBe(false);
    expect(ehMesmaOrigem('http://localhost:3333', undefined)).toBe(false);
  });

  it('responde 404 em rota inexistente', async () => {
    expect((await pedir('GET', '/nao-existe', { token })).status).toBe(404);
  });

  it('responde 404 em registro inexistente', async () => {
    expect((await pedir('GET', '/veiculos/9999', { token })).status).toBe(404);
    expect((await pedir('GET', '/motoristas/9999', { token })).status).toBe(404);
  });

  it('recusa identificador inválido', async () => {
    expect((await pedir('GET', '/veiculos/abc', { token })).status).toBe(400);
  });
});
