import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Gauge,
  IdCard,
  PieChart,
  Route,
  Truck,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useUsuario } from '../auth/useAuth';
import { Avatar } from '../components/Avatar';
import { BadgeCnh, BadgeSituacao, BadgeTipo } from '../components/Badges';
import { BarraDeProporcao, BarrasHorizontais, GraficoColunas, Sparkline } from '../components/Graficos';
import { useAlertas } from '../components/layout/useAlertas';
import { PlacaVeiculo } from '../components/PlacaVeiculo';
import { Botao, BotaoLink } from '../components/ui/Botao';
import { Cartao } from '../components/ui/Cartao';
import { Carregando, EstadoVazio, MensagemErro } from '../components/ui/Estados';
import { useNotificar } from '../components/ui/useNotificar';
import { useConsulta } from '../hooks/useConsulta';
import {
  descreverPrazo,
  descreverValidadeCnh,
  formatarData,
  formatarKm,
  formatarMes,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarPlaca,
  plural,
} from '../lib/formatacao';
import type { Alertas, Dashboard, Manutencao } from '../lib/tipos';
import { ConcluirManutencao } from './manutencoes/ConcluirManutencao';
import { mensagemConclusao } from './manutencoes/mensagens';

/** RF02 (indicadores) e RF03 (alertas): visão geral da frota. */
export function DashboardPage() {
  const { dados, erro, recarregar } = useConsulta<Dashboard>('/dashboard');
  const { alertas, recarregarAlertas } = useAlertas();
  const [concluindo, setConcluindo] = useState<Manutencao | null>(null);
  const notificar = useNotificar();
  const location = useLocation();

  // O sino do cabeçalho leva a /#alertas: rola até a seção quando ela existir
  useEffect(() => {
    if (location.hash === '#alertas' && alertas) {
      document.getElementById('alertas')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash, location.key, alertas]);

  if (erro && !dados) return <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} />;
  if (!dados) return <Carregando texto="Calculando indicadores..." />;

  const { frota, quilometragem, custos, manutencoes } = dados;
  const mesAnterior = custos.porMes.at(-2)?.mes;

  return (
    <>
      <BannerBoasVindas alertas={alertas} />

      {/* Indicadores principais (RF02) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Veículos na frota" Icone={Truck} valor={formatarNumero(frota.veiculos)} link="/veiculos">
          <span className="font-semibold text-slate-700">{frota.ativos} ativos</span> · {frota.emManutencao} em manutenção
        </Indicador>
        <Indicador titulo="Quilometragem média" Icone={Gauge} valor={formatarKm(quilometragem.media)}>
          Frota soma <span className="font-semibold text-slate-700">{formatarKm(quilometragem.total)}</span>
        </Indicador>
        <Indicador
          titulo="Custo no mês"
          Icone={Wallet}
          valor={formatarMoeda(custos.mesAtual)}
          extra={
            <Sparkline
              valores={custos.porMes.map((mes) => mes.total)}
              descricao="Tendência do custo de manutenção nos últimos 12 meses"
            />
          }
        >
          {/* Referência neutra: o mês atual ainda está em andamento, então um percentual
              de variação contra o mês anterior completo seria enganoso */}
          Em {mesAnterior ? formatarMes(mesAnterior) : 'mês anterior'}:{' '}
          <span className="font-semibold text-slate-700">{formatarMoeda(custos.mesAnterior)}</span>
        </Indicador>
        <Indicador
          titulo="Manutenções pendentes"
          Icone={Wrench}
          valor={formatarNumero(manutencoes.pendentes)}
          link="/manutencoes?status=PENDENTE"
        >
          {manutencoes.vencidas > 0 || manutencoes.proximas > 0 ? (
            <span className="flex flex-wrap gap-x-2">
              {manutencoes.vencidas > 0 && (
                <span className="font-semibold text-red-600">{plural(manutencoes.vencidas, 'vencida', 'vencidas')}</span>
              )}
              {manutencoes.proximas > 0 && (
                <span className="font-semibold text-amber-600">{plural(manutencoes.proximas, 'próxima', 'próximas')}</span>
              )}
            </span>
          ) : (
            'Nenhuma vencida ou próxima'
          )}
        </Indicador>
      </div>

      {/* Alertas (RF03) */}
      <section id="alertas" className="mt-6 grid scroll-mt-24 gap-6 lg:grid-cols-3">
        <Cartao
          className="lg:col-span-2"
          semEspaco
          icone={BellRing}
          titulo="Alertas de manutenção"
          descricao="Vencidas ou próximas do limite de data ou quilometragem."
          acoes={
            <BotaoLink to="/manutencoes?status=PENDENTE" variante="fantasma" tamanho="sm">
              Ver pendentes <ArrowRight className="size-3.5" aria-hidden />
            </BotaoLink>
          }
        >
          {!alertas ? (
            <Carregando />
          ) : alertas.manutencoes.length === 0 ? (
            <EstadoVazio icone={CheckCircle2} titulo="Nenhum alerta de manutenção" descricao="As preventivas estão em dia." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertas.manutencoes.map((manutencao) => {
                const vencida = manutencao.situacao === 'VENCIDA';
                return (
                  <li key={manutencao.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                        vencida ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                      aria-hidden
                    >
                      <Wrench className="size-5" />
                    </span>
                    <div className="min-w-48 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                        {manutencao.descricao}
                        {manutencao.situacao && <BadgeSituacao situacao={manutencao.situacao} />}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <Link to={`/veiculos/${manutencao.veiculo.id}`} className="hover:opacity-80">
                          <PlacaVeiculo placa={manutencao.veiculo.placa} tamanho="sm" />
                        </Link>
                        <BadgeTipo tipo={manutencao.tipo} />
                        <span className={vencida ? 'font-medium text-red-600' : ''}>
                          {descreverPrazo(manutencao.diasRestantes, manutencao.kmRestantes)}
                        </span>
                      </p>
                    </div>
                    <Botao variante="secundario" tamanho="sm" icone={CheckCircle2} onClick={() => setConcluindo(manutencao)}>
                      Concluir
                    </Botao>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao semEspaco icone={IdCard} titulo="Validade da CNH" descricao="Motoristas com CNH vencida ou perto de vencer.">
          {!alertas ? (
            <Carregando />
          ) : alertas.cnh.length === 0 ? (
            <EstadoVazio icone={CheckCircle2} titulo="Todas as CNHs em dia" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertas.cnh.map((motorista) => (
                <li key={motorista.id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                  <Avatar nome={motorista.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{motorista.nome}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatarData(motorista.validadeCnh)} · {descreverValidadeCnh(motorista.diasParaVencer)}
                      {motorista.veiculo && ` · ${formatarPlaca(motorista.veiculo.placa)}`}
                    </p>
                    <div className="mt-1.5">
                      <BadgeCnh situacao={motorista.situacaoCnh} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </section>

      {/* Custos (RF02) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Cartao
          className="lg:col-span-2"
          icone={BarChart3}
          titulo="Custos de manutenção"
          descricao={`Últimos 12 meses · total de ${formatarMoeda(custos.ultimos12Meses)}`}
        >
          <GraficoColunas
            titulo="Custo de manutenção por mês"
            pontos={custos.porMes.map(({ mes, total }) => ({
              rotulo: formatarMes(mes, false),
              rotuloCompleto: `${formatarMes(mes, false)} de ${mes.slice(0, 4)}`,
              valor: total,
            }))}
            formatarValor={formatarMoeda}
            formatarEixo={formatarMoedaCompacta}
          />
        </Cartao>

        <Cartao icone={PieChart} titulo="Preventiva × corretiva" descricao="Custo nos últimos 12 meses">
          <BarraDeProporcao
            formatarValor={formatarMoeda}
            partes={[
              { rotulo: 'Preventiva', valor: custos.porTipo.PREVENTIVA, cor: 'bg-marca-600' },
              { rotulo: 'Corretiva', valor: custos.porTipo.CORRETIVA, cor: 'bg-slate-300' },
            ]}
          />
          <p className="mt-5 rounded-xl bg-marca-50 p-3 text-xs leading-relaxed text-marca-800">
            Quanto maior a parte preventiva, menos a frota para por quebras inesperadas.
          </p>
        </Cartao>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao icone={Wallet} titulo="Maiores custos por veículo" descricao="Últimos 12 meses, incluindo veículos já inativados">
          {custos.porVeiculo.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum custo registrado no período.</p>
          ) : (
            <BarrasHorizontais
              titulo="Custo de manutenção por veículo"
              formatarValor={formatarMoeda}
              itens={custos.porVeiculo.map((veiculo) => ({
                id: veiculo.id,
                rotulo: formatarPlaca(veiculo.placa),
                detalhe: veiculo.modelo,
                valor: veiculo.total,
                link: `/veiculos/${veiculo.id}`,
              }))}
            />
          )}
        </Cartao>

        <Cartao
          icone={Route}
          titulo="Quilometragem por veículo"
          descricao="Hodômetro atual da frota ativa"
          acoes={
            quilometragem.porVeiculo.length > 8 && (
              <BotaoLink to="/veiculos" variante="fantasma" tamanho="sm">
                Ver todos
              </BotaoLink>
            )
          }
        >
          {quilometragem.porVeiculo.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum veículo ativo.</p>
          ) : (
            <BarrasHorizontais
              titulo="Quilometragem por veículo"
              formatarValor={formatarKm}
              itens={quilometragem.porVeiculo.slice(0, 8).map((veiculo) => ({
                id: veiculo.id,
                rotulo: formatarPlaca(veiculo.placa),
                detalhe: veiculo.modelo,
                valor: veiculo.kmAtual,
                link: `/veiculos/${veiculo.id}`,
              }))}
            />
          )}
        </Cartao>
      </div>

      {concluindo && (
        <ConcluirManutencao
          manutencao={concluindo}
          aoFechar={() => setConcluindo(null)}
          aoConcluir={(resultado) => {
            setConcluindo(null);
            notificar('sucesso', mensagemConclusao(resultado));
            recarregar();
            recarregarAlertas();
          }}
        />
      )}
    </>
  );
}

function saudacao(hora: number): string {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Faixa azul do topo: saudação e resumo do que precisa de atenção. */
function BannerBoasVindas({ alertas }: { alertas: Alertas | undefined }) {
  const usuario = useUsuario();
  const [hora] = useState(() => new Date().getHours());
  const primeiroNome = usuario.nome.split(' ')[0];
  const resumo = alertas?.resumo;

  const pendencias = resumo
    ? [
        resumo.manutencoesVencidas > 0 && plural(resumo.manutencoesVencidas, 'manutenção vencida', 'manutenções vencidas'),
        resumo.manutencoesProximas > 0 && plural(resumo.manutencoesProximas, 'próxima do limite', 'próximas do limite'),
        resumo.cnhVencidas + resumo.cnhVencendo > 0 &&
          plural(resumo.cnhVencidas + resumo.cnhVencendo, 'CNH para regularizar', 'CNHs para regularizar'),
      ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-marca-600 via-marca-700 to-marca-900 px-6 py-7 text-white shadow-xl shadow-marca-700/20 sm:px-8">
      <div className="absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-24 right-40 size-64 rounded-full bg-sky-300/20 blur-3xl" aria-hidden />
      <Truck className="absolute -bottom-6 right-6 hidden size-40 text-white/8 sm:block" strokeWidth={1.25} aria-hidden />

      <div className="relative max-w-2xl">
        <p className="text-sm font-semibold text-marca-100">Visão geral da frota</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {saudacao(hora)}, {primeiroNome}!
        </h1>
        <p className="mt-2 text-marca-100">
          {!resumo
            ? 'Carregando os alertas da frota...'
            : pendencias.length === 0
              ? 'Tudo em dia: nenhuma manutenção ou CNH precisa de atenção agora.'
              : `Atenção para ${pendencias.join(', ').replace(/, ([^,]*)$/, ' e $1')}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <BotaoLink to="/#alertas" variante="claro" tamanho="sm" icone={BellRing}>
            Ver alertas
          </BotaoLink>
          <BotaoLink to="/manutencoes" variante="claro" tamanho="sm" icone={Wrench}>
            Manutenções
          </BotaoLink>
        </div>
      </div>
    </section>
  );
}

function Indicador({
  titulo,
  Icone,
  valor,
  link,
  extra,
  children,
}: {
  titulo: string;
  Icone: LucideIcon;
  valor: string;
  link?: string;
  /** Conteúdo à direita do valor (ex.: minilinha de tendência) */
  extra?: ReactNode;
  children: ReactNode;
}) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-sm font-semibold text-slate-500 group-hover:text-marca-700">{titulo}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600 transition group-hover:bg-marca-600 group-hover:text-white">
          <Icone className="size-5" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {/* whitespace-nowrap: sem isto "R$ 3.090,00" quebra no espaço depois do
            cifrão, e o valor deste cartão desalinha dos outros da fileira.
            O tamanho cresce conforme a largura do próprio cartão. */}
        <p className="whitespace-nowrap text-2xl font-bold tracking-tight text-slate-900 @min-[12rem]:text-3xl">
          {valor}
        </p>
        {/* O minigráfico só aparece quando sobra espaço de verdade ao lado do
            valor. Em cartão estreito ele empurrava o conteúdo para fora. */}
        {extra && <span className="hidden shrink-0 @min-[15rem]:block">{extra}</span>}
      </div>
      <div className="mt-1.5 text-sm text-slate-500">{children}</div>
    </>
  );
  // Subgrade: as três linhas (título, valor, detalhe) têm a mesma altura em todos os
  // cartões da fileira, então os valores ficam alinhados mesmo se um título quebrar
  // @container: as medidas de dentro reagem à largura do cartão, não à da
  // janela — o mesmo cartão fica estreito em 4 colunas e largo em 2.
  // overflow-hidden é a garantia final de que nada transborda para o vizinho.
  const classes =
    '@container group row-span-3 grid grid-rows-subgrid gap-y-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';
  return link ? (
    <Link to={link} className={`${classes} transition hover:border-marca-200 hover:shadow-lg hover:shadow-marca-900/5`}>
      {conteudo}
    </Link>
  ) : (
    <article className={classes}>{conteudo}</article>
  );
}
