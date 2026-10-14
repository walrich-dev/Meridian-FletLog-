// Dados FICTÍCIOS de demonstração, usados para popular o banco.
//
// As datas são relativas ao dia em que os dados são criados, para que sempre existam
// situações de alerta: preventiva vencida por data e por km, preventivas próximas do
// limite, CNH vencida e CNH vencendo. Também há um ano de histórico de custos.
import { adicionarDias, hoje } from '../regras/datas.js';
import { calcularDigitosCpf } from '../regras/documentos.js';
import type { CategoriaCnh, StatusManutencao, StatusVeiculo, TipoManutencao } from '../tipos.js';

/** Acessos de demonstração (pessoas fictícias). */
export const ACESSOS_DEMONSTRACAO = [
  { nome: 'Mariana Costa', email: 'admin@meridian.local', senha: 'Frota@2026', perfil: 'ADMIN' },
  { nome: 'Rafael Alves', email: 'gestor@meridian.local', senha: 'Gestor@2026', perfil: 'GESTOR' },
] as const;

export type MotoristaDemo = {
  id: number;
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCnh: CategoriaCnh;
  validadeCnh: string;
  telefone: string | null;
};

export type VeiculoDemo = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  chassi: string;
  renavam: string;
  anoAquisicao: number;
  kmAtual: number;
  status: StatusVeiculo;
  motoristaId: number | null;
};

export type ManutencaoDemo = {
  veiculoId: number;
  tipo: TipoManutencao;
  descricao: string;
  status: StatusManutencao;
  dataProgramada: string | null;
  kmLimite: number | null;
  intervaloKm: number | null;
  intervaloDias: number | null;
  dataRealizacao: string | null;
  kmRealizacao: number | null;
  custo: number | null;
  oficina: string | null;
};

type NovaManutencao = Pick<ManutencaoDemo, 'tipo' | 'descricao'> & Partial<ManutencaoDemo>;
type NovoMotorista = Pick<MotoristaDemo, 'nome' | 'cnh' | 'categoriaCnh' | 'telefone'> & {
  baseCpf: string;
  validadeEmDias: number;
};
type NovoVeiculo = Pick<
  VeiculoDemo,
  'placa' | 'marca' | 'modelo' | 'chassi' | 'renavam' | 'anoAquisicao' | 'kmAtual'
> &
  Partial<Pick<VeiculoDemo, 'status'>>;

export type DadosDemonstracao = {
  motoristas: MotoristaDemo[];
  veiculos: VeiculoDemo[];
  manutencoes: ManutencaoDemo[];
};

export function criarDadosDemonstracao(dataHoje = hoje()): DadosDemonstracao {
  const motoristas: MotoristaDemo[] = [];
  const veiculos: VeiculoDemo[] = [];
  const manutencoes: ManutencaoDemo[] = [];

  /** Data relativa a hoje, no formato de uma coluna DATE. Ex.: dia(-30) = 30 dias atrás. */
  const dia = (deslocamento: number) => adicionarDias(dataHoje, deslocamento).toISOString().slice(0, 10);

  function motorista({ baseCpf, validadeEmDias, ...dados }: NovoMotorista): number {
    const id = motoristas.length + 1;
    motoristas.push({
      id,
      ...dados,
      cpf: baseCpf + calcularDigitosCpf(baseCpf), // CPF fictício, mas com dígitos válidos
      validadeCnh: dia(validadeEmDias),
    });
    return id;
  }

  function veiculo(dados: NovoVeiculo, motoristaId: number | null, lista: NovaManutencao[]) {
    const veiculoId = veiculos.length + 1;
    veiculos.push({ status: 'ATIVO', ...dados, id: veiculoId, motoristaId });

    for (const manutencao of lista) {
      manutencoes.push({
        veiculoId,
        status: 'PENDENTE',
        dataProgramada: null,
        kmLimite: null,
        intervaloKm: null,
        intervaloDias: null,
        dataRealizacao: null,
        kmRealizacao: null,
        custo: null,
        oficina: null,
        ...manutencao,
      });
    }
  }

  // Motoristas
  const ana = motorista({
    nome: 'Ana Paula Souza',
    baseCpf: '529982247',
    cnh: '04512345678',
    categoriaCnh: 'D',
    validadeEmDias: 420,
    telefone: '61991230001',
  });
  const bruno = motorista({
    nome: 'Bruno Henrique Lima',
    baseCpf: '111444777',
    cnh: '05823456789',
    categoriaCnh: 'E',
    validadeEmDias: 10, // CNH vencendo
    telefone: '61991230002',
  });
  const carla = motorista({
    nome: 'Carla Mendes',
    baseCpf: '390533447',
    cnh: '06934567890',
    categoriaCnh: 'C',
    validadeEmDias: -5, // CNH vencida
    telefone: '61991230003',
  });
  const diego = motorista({
    nome: 'Diego Ferreira',
    baseCpf: '275484389',
    cnh: '07045678901',
    categoriaCnh: 'AD',
    validadeEmDias: 700,
    telefone: '61991230004',
  });
  // Motorista disponível, sem veículo vinculado
  motorista({
    nome: 'Eduardo Santos',
    baseCpf: '853513468',
    cnh: '08156789012',
    categoriaCnh: 'B',
    validadeEmDias: 250,
    telefone: '61991230005',
  });

  // Preventiva perto do km limite (faltam 430 km) -> alerta por km
  veiculo(
    {
      placa: 'RTA1B23',
      marca: 'Mercedes-Benz',
      modelo: 'Accelo 1016',
      chassi: '9BM979076NB100001',
      renavam: '00123456701',
      anoAquisicao: 2022,
      kmAtual: 49_420,
    },
    ana,
    [
      {
        tipo: 'PREVENTIVA',
        descricao: 'Revisão dos 30.000 km',
        status: 'REALIZADA',
        kmLimite: 30_000,
        dataRealizacao: dia(-275),
        kmRealizacao: 29_900,
        custo: 1_150,
        oficina: 'Concessionária autorizada',
      },
      {
        tipo: 'CORRETIVA',
        descricao: 'Troca da bateria',
        status: 'REALIZADA',
        dataRealizacao: dia(-150),
        kmRealizacao: 35_200,
        custo: 780,
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 40_000,
        intervaloKm: 10_000,
        intervaloDias: 180,
        dataRealizacao: dia(-92),
        kmRealizacao: 39_850,
        custo: 850,
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        kmLimite: 49_850,
        dataProgramada: dia(88),
        intervaloKm: 10_000,
        intervaloDias: 180,
      },
    ],
  );

  // Preventiva programada para daqui a 7 dias -> alerta por data
  veiculo(
    {
      placa: 'SBC2D34',
      marca: 'Volkswagen',
      modelo: 'Delivery 11.180',
      chassi: '9BWAB45U8MT100002',
      renavam: '00123456702',
      anoAquisicao: 2021,
      kmAtual: 87_300,
    },
    bruno,
    [
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 72_000,
        dataRealizacao: dia(-330),
        kmRealizacao: 71_800,
        custo: 920,
        oficina: 'Diesel Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 81_800,
        dataRealizacao: dia(-180),
        kmRealizacao: 80_500,
        custo: 960,
        oficina: 'Diesel Center Formosa',
      },
      {
        tipo: 'CORRETIVA',
        descricao: 'Reparo no alternador',
        status: 'REALIZADA',
        dataRealizacao: dia(-120),
        kmRealizacao: 82_900,
        custo: 1_450,
        oficina: 'Auto Elétrica Planalto',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Revisão do sistema de freios',
        dataProgramada: dia(7),
        intervaloDias: 365,
      },
      {
        tipo: 'CORRETIVA',
        descricao: 'Substituição do kit de embreagem',
        status: 'REALIZADA',
        dataRealizacao: dia(-40),
        kmRealizacao: 84_100,
        custo: 3_200,
        oficina: 'Diesel Center Formosa',
      },
    ],
  );

  // Veículo em manutenção, com preventiva vencida por km (130.000 < 132.400)
  veiculo(
    {
      placa: 'QWE3F45',
      marca: 'Fiat',
      modelo: 'Ducato Cargo',
      chassi: '9BD25082LK8100003',
      renavam: '00123456703',
      anoAquisicao: 2020,
      kmAtual: 132_400,
      status: 'EM_MANUTENCAO',
    },
    carla,
    [
      {
        tipo: 'CORRETIVA',
        descricao: 'Reparo na suspensão dianteira',
        dataProgramada: dia(2),
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Alinhamento e balanceamento',
        kmLimite: 130_000,
        intervaloKm: 10_000,
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 112_000,
        dataRealizacao: dia(-300),
        kmRealizacao: 111_700,
        custo: 540,
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'CORRETIVA',
        descricao: 'Troca das pastilhas de freio',
        status: 'REALIZADA',
        dataRealizacao: dia(-240),
        kmRealizacao: 116_300,
        custo: 620,
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 128_000,
        dataRealizacao: dia(-60),
        kmRealizacao: 127_600,
        custo: 560,
        oficina: 'Auto Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca dos pneus',
        status: 'REALIZADA',
        kmLimite: 125_000,
        dataRealizacao: dia(-20),
        kmRealizacao: 125_300,
        custo: 2_400,
        oficina: 'Pneus Planalto',
      },
    ],
  );

  // Veículo novo, sem alertas
  veiculo(
    {
      placa: 'RFT4G56',
      marca: 'Renault',
      modelo: 'Master Furgão',
      chassi: '93YMAF4XEPJ100004',
      renavam: '00123456704',
      anoAquisicao: 2023,
      kmAtual: 21_900,
    },
    diego,
    [
      {
        tipo: 'PREVENTIVA',
        descricao: 'Revisão dos 10.000 km',
        status: 'REALIZADA',
        kmLimite: 10_000,
        dataRealizacao: dia(-210),
        kmRealizacao: 10_100,
        custo: 480,
        oficina: 'Concessionária autorizada',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Revisão dos 20.000 km',
        status: 'REALIZADA',
        kmLimite: 20_000,
        dataRealizacao: dia(-15),
        kmRealizacao: 20_050,
        custo: 690,
        oficina: 'Concessionária autorizada',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Revisão dos 30.000 km',
        kmLimite: 30_000,
        intervaloKm: 10_000,
      },
    ],
  );

  // Veículo sem motorista, com preventiva vencida por data
  veiculo(
    {
      placa: 'GHJ5K67',
      marca: 'Iveco',
      modelo: 'Daily 35-150',
      chassi: '93ZC35A0LK8100005',
      renavam: '00123456705',
      anoAquisicao: 2019,
      kmAtual: 158_000,
    },
    null,
    [
      {
        tipo: 'CORRETIVA',
        descricao: 'Substituição do radiador',
        status: 'REALIZADA',
        dataRealizacao: dia(-345),
        kmRealizacao: 139_500,
        custo: 2_100,
        oficina: 'Diesel Center Formosa',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca de óleo e filtros',
        status: 'REALIZADA',
        kmLimite: 150_000,
        dataRealizacao: dia(-165),
        kmRealizacao: 149_800,
        custo: 610,
        oficina: 'Diesel Center Formosa',
      },
      {
        tipo: 'CORRETIVA',
        descricao: 'Troca dos amortecedores',
        status: 'REALIZADA',
        dataRealizacao: dia(-75),
        kmRealizacao: 154_900,
        custo: 1_880,
        oficina: 'Pneus Planalto',
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Troca da correia dentada',
        dataProgramada: dia(-3),
        intervaloKm: 60_000,
      },
      {
        tipo: 'PREVENTIVA',
        descricao: 'Higienização do ar-condicionado',
        status: 'CANCELADA',
        dataProgramada: dia(-30),
      },
    ],
  );

  // Veículo inativo (exclusão lógica), mantido pelo histórico de custos. Placa no padrão antigo.
  veiculo(
    {
      placa: 'MNB6578',
      marca: 'Volkswagen',
      modelo: 'Constellation 24.280',
      chassi: '9BWVC82E1KR100006',
      renavam: '00123456706',
      anoAquisicao: 2018,
      kmAtual: 241_500,
      status: 'INATIVO',
    },
    null,
    [
      {
        tipo: 'CORRETIVA',
        descricao: 'Retífica do motor',
        status: 'REALIZADA',
        dataRealizacao: dia(-200),
        kmRealizacao: 238_900,
        custo: 12_600,
        oficina: 'Diesel Center Formosa',
      },
    ],
  );
  return { motoristas, veiculos, manutencoes };
}
