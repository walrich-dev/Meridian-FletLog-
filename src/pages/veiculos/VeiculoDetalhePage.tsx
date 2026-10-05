import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gauge,
  ListTodo,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  UserRound,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { BadgeCnh, BadgeStatusVeiculo } from '../../components/Badges';
import { CartaoResumo, LinhaResumo } from '../../components/CartaoResumo';
import { useAlertas } from '../../components/layout/useAlertas';
import { PlacaVeiculo } from '../../components/PlacaVeiculo';
import { Botao } from '../../components/ui/Botao';
import { Cartao } from '../../components/ui/Cartao';
import { Carregando, EstadoVazio, MensagemErro } from '../../components/ui/Estados';
import { useNotificar } from '../../components/ui/useNotificar';
import { useConsulta } from '../../hooks/useConsulta';
import { api } from '../../lib/api';
import {
  descreverValidadeCnh,
  formatarData,
  formatarKm,
  formatarMoeda,
  formatarTelefone,
  plural,
  ROTULO_STATUS_VEICULO,
} from '../../lib/formatacao';
import type { Manutencao, VeiculoDetalhe } from '../../lib/tipos';
import { ManutencaoFormulario } from '../manutencoes/ManutencaoFormulario';
import { mensagemConclusao } from '../manutencoes/mensagens';
import { TabelaManutencoes } from '../manutencoes/TabelaManutencoes';
import { AtualizarKm } from './AtualizarKm';
import { InativarVeiculo } from './InativarVeiculo';
import { VeiculoFormulario } from './VeiculoFormulario';

type Acao = 'editar' | 'km' | 'inativar' | 'manutencao';

/** Ficha do veículo: dados, motorista responsável, custos e histórico de manutenções. */
export function VeiculoDetalhePage() {
  const { id } = useParams();
  const veiculoConsulta = useConsulta<VeiculoDetalhe>(`/veiculos/${id}`);
  const manutencoesConsulta = useConsulta<Manutencao[]>(`/manutencoes?veiculoId=${id}`);
  const [acao, setAcao] = useState<Acao | null>(null);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  const veiculo = veiculoConsulta.dados;
  const manutencoes = manutencoesConsulta.dados;

  function recarregarTudo() {
    veiculoConsulta.recarregar();
    manutencoesConsulta.recarregar();
    recarregarAlertas();
  }

  function aposAlterar(mensagem: string) {
    setAcao(null);
    notificar('sucesso', mensagem);
    recarregarTudo();
  }

  async function reativar() {
    try {
      await api.post(`/veiculos/${id}/reativar`);
      aposAlterar('Veículo reativado.');
    } catch (falha) {
      notificar('erro', (falha as Error).message);
    }
  }

  if (veiculoConsulta.erro && !veiculo) {
    return (
      <>
        <VoltarParaVeiculos />
        <MensagemErro mensagem={veiculoConsulta.erro} aoTentarDeNovo={veiculoConsulta.recarregar} />
      </>
    );
  }
  if (!veiculo) return <Carregando />;

  const inativo = veiculo.status === 'INATIVO';
  const pendentes = manutencoes?.filter((m) => m.status === 'PENDENTE') ?? [];
  const vencidas = pendentes.filter((m) => m.situacao === 'VENCIDA').length;

  return (
    <>
      <VoltarParaVeiculos />

      {/* Cabeçalho do veículo */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="h-2 bg-linear-to-r from-marca-500 via-marca-700 to-marca-900" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="flex flex-wrap items-center gap-5">
            <PlacaVeiculo placa={veiculo.placa} tamanho="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {veiculo.marca} {veiculo.modelo}
                </h1>
                <BadgeStatusVeiculo status={veiculo.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Adquirido em {veiculo.anoAquisicao} · {formatarKm(veiculo.kmAtual)} rodados
              </p>
            </div>
          </div>
          {inativo ? (
            <Botao icone={RotateCcw} onClick={reativar}>
              Reativar veículo
            </Botao>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Botao icone={Plus} onClick={() => setAcao('manutencao')}>
                Nova manutenção
              </Botao>
              <Botao variante="secundario" icone={Gauge} onClick={() => setAcao('km')}>
                Atualizar km
              </Botao>
              <Botao variante="secundario" icone={Pencil} onClick={() => setAcao('editar')}>
                Editar
              </Botao>
              <Botao variante="secundario" icone={Archive} onClick={() => setAcao('inativar')}>
                Inativar
              </Botao>
            </div>
          )}
        </div>
      </section>

      <LinhaResumo>
        <CartaoResumo rotulo="Quilometragem atual" valor={formatarKm(veiculo.kmAtual)} icone={Gauge} />
        <CartaoResumo rotulo="Custo de manutenção" valor={formatarMoeda(veiculo.custoTotal)} icone={Wallet} detalhe="Total do histórico" />
        <CartaoResumo
          rotulo="Serviços realizados"
          valor={veiculo.manutencoesRealizadas}
          icone={CheckCircle2}
          tom="verde"
          detalhe={plural(veiculo.manutencoesRealizadas, 'manutenção concluída', 'manutenções concluídas')}
        />
        <CartaoResumo
          rotulo="Pendentes"
          valor={pendentes.length}
          icone={ListTodo}
          tom={vencidas ? 'vermelho' : 'marca'}
          detalhe={vencidas ? plural(vencidas, 'vencida', 'vencidas') : 'Nenhuma vencida'}
        />
      </LinhaResumo>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Cartao icone={FileText} titulo="Dados do veículo">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Item rotulo="Marca">{veiculo.marca}</Item>
            <Item rotulo="Modelo">{veiculo.modelo}</Item>
            <Item rotulo="Ano de aquisição">{veiculo.anoAquisicao}</Item>
            <Item rotulo="Status">{ROTULO_STATUS_VEICULO[veiculo.status]}</Item>
            <Item rotulo="Chassi">
              <span className="font-mono">{veiculo.chassi}</span>
            </Item>
            <Item rotulo="RENAVAM">
              <span className="font-mono">{veiculo.renavam}</span>
            </Item>
          </dl>
        </Cartao>

        <Cartao icone={UserRound} titulo="Motorista responsável">
          {veiculo.motorista ? (
            <div className="flex flex-wrap items-start gap-4">
              <Avatar nome={veiculo.motorista.nome} tamanho="lg" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{veiculo.motorista.nome}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="size-3.5" aria-hidden />
                    {formatarTelefone(veiculo.motorista.telefone)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Validade da CNH</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{formatarData(veiculo.motorista.validadeCnh)}</span>
                    <BadgeCnh situacao={veiculo.motorista.situacaoCnh} />
                  </div>
                  {veiculo.motorista.situacaoCnh !== 'VALIDA' && (
                    <p className="mt-1 text-xs text-slate-500">{descreverValidadeCnh(veiculo.motorista.diasParaVencer)}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EstadoVazio
              icone={UserRound}
              titulo="Nenhum motorista vinculado"
              acao={
                !inativo && (
                  <Botao variante="secundario" tamanho="sm" onClick={() => setAcao('editar')}>
                    Vincular motorista
                  </Botao>
                )
              }
            />
          )}
        </Cartao>
      </div>

      <Cartao
        semEspaco
        icone={Wrench}
        titulo="Manutenções"
        descricao="Pendentes primeiro, das mais urgentes; depois o histórico."
      >
        {manutencoesConsulta.erro && (
          <div className="p-4">
            <MensagemErro mensagem={manutencoesConsulta.erro} aoTentarDeNovo={manutencoesConsulta.recarregar} />
          </div>
        )}
        {!manutencoes ? (
          !manutencoesConsulta.erro && <Carregando />
        ) : manutencoes.length === 0 ? (
          <EstadoVazio icone={Wrench} titulo="Nenhuma manutenção registrada para este veículo" />
        ) : (
          <TabelaManutencoes manutencoes={manutencoes} mostrarVeiculo={false} aoAlterar={recarregarTudo} />
        )}
      </Cartao>

      {acao === 'editar' && (
        <VeiculoFormulario veiculo={veiculo} aoFechar={() => setAcao(null)} aoSalvar={() => aposAlterar('Alterações salvas.')} />
      )}
      {acao === 'km' && (
        <AtualizarKm
          veiculo={veiculo}
          aoFechar={() => setAcao(null)}
          aoSalvar={(salvo) => aposAlterar(`Quilometragem atualizada: ${formatarKm(salvo.kmAtual)}.`)}
        />
      )}
      {acao === 'inativar' && (
        <InativarVeiculo veiculo={veiculo} aoFechar={() => setAcao(null)} aoInativar={() => aposAlterar('Veículo inativado.')} />
      )}
      {acao === 'manutencao' && (
        <ManutencaoFormulario
          veiculoId={veiculo.id}
          aoFechar={() => setAcao(null)}
          aoSalvar={(resultado) => {
            const registrada = resultado.manutencao.status === 'REALIZADA';
            aposAlterar(mensagemConclusao(resultado, registrada ? 'Serviço registrado.' : 'Manutenção programada.'));
          }}
        />
      )}
    </>
  );
}

function VoltarParaVeiculos() {
  return (
    <Link
      to="/veiculos"
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-marca-700"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Voltar para veículos
    </Link>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{rotulo}</dt>
      <dd className="mt-1 font-medium text-slate-800">{children}</dd>
    </div>
  );
}
