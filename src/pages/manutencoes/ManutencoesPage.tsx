import { AlertTriangle, Clock, ListTodo, Plus, Wallet, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { CabecalhoPagina } from '../../components/CabecalhoPagina';
import { CartaoResumo, LinhaResumo } from '../../components/CartaoResumo';
import { BarraFiltros, CampoBusca, FiltroSelecao } from '../../components/Filtros';
import { useAlertas } from '../../components/layout/useAlertas';
import { Botao } from '../../components/ui/Botao';
import { Cartao } from '../../components/ui/Cartao';
import { Carregando, EstadoVazio, MensagemErro } from '../../components/ui/Estados';
import { useNotificar } from '../../components/ui/useNotificar';
import { useAtraso } from '../../hooks/useAtraso';
import { useConsulta } from '../../hooks/useConsulta';
import { comFiltros } from '../../lib/api';
import { formatarMoeda, hojeParaInput } from '../../lib/formatacao';
import type { Manutencao } from '../../lib/tipos';
import { ManutencaoFormulario } from './ManutencaoFormulario';
import { mensagemConclusao } from './mensagens';
import { TabelaManutencoes } from './TabelaManutencoes';

// Filtros guardados na URL: o dashboard abre esta página já filtrada (ex.: ?status=PENDENTE)
const FILTROS = ['situacao', 'status', 'tipo'] as const;
type Filtro = (typeof FILTROS)[number];

/** RF03: programação e histórico de manutenções preventivas e corretivas. */
export function ManutencoesPage() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = Object.fromEntries(FILTROS.map((nome) => [nome, parametros.get(nome) ?? ''])) as Record<Filtro, string>;
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useAtraso(busca);

  const lista = useConsulta<Manutencao[]>(comFiltros('/manutencoes', { ...filtros, busca: buscaAtrasada }));
  // Todas as manutenções, sem filtros, para os números de resumo
  const todas = useConsulta<Manutencao[]>('/manutencoes');
  const [novo, setNovo] = useState(false);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  const manutencoes = lista.dados;
  const resumo = resumir(todas.dados ?? []);
  const filtrando = Boolean(busca || Object.values(filtros).some(Boolean));

  function recarregarTudo() {
    lista.recarregar();
    todas.recarregar();
  }

  function alterarFiltro(nome: Filtro, valor: string) {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(nome, valor);
    else novos.delete(nome);
    // Situação só existe nas pendentes, então os dois filtros não se combinam
    if (nome === 'situacao' && valor) novos.delete('status');
    if (nome === 'status' && valor) novos.delete('situacao');
    setParametros(novos);
  }

  /** Cartão de resumo como atalho: clicar de novo remove o filtro. */
  const alternar = (nome: Filtro, valor: string) => alterarFiltro(nome, filtros[nome] === valor ? '' : valor);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Operação"
        titulo="Manutenções"
        descricao="Programação de preventivas, registro de serviços realizados e seus custos."
        acoes={
          <Botao icone={Plus} onClick={() => setNovo(true)}>
            Nova manutenção
          </Botao>
        }
      />

      <LinhaResumo>
        <CartaoResumo
          rotulo="Vencidas"
          valor={resumo.vencidas}
          icone={AlertTriangle}
          tom={resumo.vencidas ? 'vermelho' : 'verde'}
          detalhe="Passaram da data ou do km"
          aoClicar={() => alternar('situacao', 'VENCIDA')}
          ativo={filtros.situacao === 'VENCIDA'}
        />
        <CartaoResumo
          rotulo="Próximas do limite"
          valor={resumo.proximas}
          icone={Clock}
          tom={resumo.proximas ? 'amarelo' : 'verde'}
          detalhe="Dentro da antecedência"
          aoClicar={() => alternar('situacao', 'PROXIMA')}
          ativo={filtros.situacao === 'PROXIMA'}
        />
        <CartaoResumo
          rotulo="Pendentes"
          valor={resumo.pendentes}
          icone={ListTodo}
          detalhe="Programadas no total"
          aoClicar={() => alternar('status', 'PENDENTE')}
          ativo={filtros.status === 'PENDENTE'}
        />
        <CartaoResumo
          rotulo="Gasto no mês"
          valor={formatarMoeda(resumo.custoNoMes)}
          icone={Wallet}
          detalhe={`${resumo.realizadasNoMes} serviços realizados`}
        />
      </LinhaResumo>

      <BarraFiltros>
        <CampoBusca valor={busca} aoAlterar={setBusca} placeholder="Buscar por serviço, oficina ou placa" />
        <FiltroSelecao rotulo="Filtrar por situação" value={filtros.situacao} aoAlterar={(v) => alterarFiltro('situacao', v)}>
          <option value="">Todas as situações</option>
          <option value="VENCIDA">Vencidas</option>
          <option value="PROXIMA">Próximas do limite</option>
          <option value="EM_DIA">Em dia</option>
        </FiltroSelecao>
        <FiltroSelecao rotulo="Filtrar por status" value={filtros.status} aoAlterar={(v) => alterarFiltro('status', v)}>
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="REALIZADA">Realizadas</option>
          <option value="CANCELADA">Canceladas</option>
        </FiltroSelecao>
        <FiltroSelecao rotulo="Filtrar por tipo" value={filtros.tipo} aoAlterar={(v) => alterarFiltro('tipo', v)}>
          <option value="">Preventivas e corretivas</option>
          <option value="PREVENTIVA">Preventivas</option>
          <option value="CORRETIVA">Corretivas</option>
        </FiltroSelecao>
      </BarraFiltros>

      {lista.erro && <MensagemErro mensagem={lista.erro} aoTentarDeNovo={lista.recarregar} />}

      <Cartao semEspaco>
        {!manutencoes && lista.carregando ? (
          <Carregando />
        ) : !manutencoes?.length ? (
          <EstadoVazio
            icone={Wrench}
            titulo={filtrando ? 'Nenhuma manutenção encontrada' : 'Nenhuma manutenção cadastrada'}
            descricao={filtrando ? 'Confira a busca e os filtros.' : 'Programe a primeira preventiva da frota.'}
          />
        ) : (
          <TabelaManutencoes manutencoes={manutencoes} aoAlterar={recarregarTudo} />
        )}
      </Cartao>

      {novo && (
        <ManutencaoFormulario
          aoFechar={() => setNovo(false)}
          aoSalvar={(resultado) => {
            setNovo(false);
            const registrada = resultado.manutencao.status === 'REALIZADA';
            notificar('sucesso', mensagemConclusao(resultado, registrada ? 'Serviço registrado.' : 'Manutenção programada.'));
            recarregarTudo();
            recarregarAlertas();
          }}
        />
      )}
    </>
  );
}

/** Números do topo da página, calculados sobre todas as manutenções. */
function resumir(manutencoes: Manutencao[]) {
  const mesAtual = hojeParaInput().slice(0, 7);
  const realizadasNoMes = manutencoes.filter(
    (m) => m.status === 'REALIZADA' && m.dataRealizacao?.slice(0, 7) === mesAtual,
  );
  // Como nos alertas, veículos inativos não contam como vencidos ou próximos
  const daFrotaAtiva = manutencoes.filter((m) => m.veiculo.status !== 'INATIVO');
  return {
    vencidas: daFrotaAtiva.filter((m) => m.situacao === 'VENCIDA').length,
    proximas: daFrotaAtiva.filter((m) => m.situacao === 'PROXIMA').length,
    pendentes: manutencoes.filter((m) => m.status === 'PENDENTE').length,
    realizadasNoMes: realizadasNoMes.length,
    custoNoMes: realizadasNoMes.reduce((soma, m) => soma + Math.round((m.custo ?? 0) * 100), 0) / 100,
  };
}
