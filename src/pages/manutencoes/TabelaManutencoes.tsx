import { Ban, CalendarClock, CheckCircle2, Gauge, Pencil, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { BadgeSituacao, BadgeStatusManutencao, BadgeTipo } from '../../components/Badges';
import { useAlertas } from '../../components/layout/useAlertas';
import { PlacaVeiculo } from '../../components/PlacaVeiculo';
import { Botao, BotaoIcone } from '../../components/ui/Botao';
import { Confirmacao } from '../../components/ui/Confirmacao';
import { classesLinha, Tabela, Td, Th } from '../../components/ui/Tabela';
import { useNotificar } from '../../components/ui/useNotificar';
import { api } from '../../lib/api';
import { descreverPrazo, formatarData, formatarKm, formatarMoeda, formatarPlaca, plural } from '../../lib/formatacao';
import type { Manutencao } from '../../lib/tipos';
import { ConcluirManutencao } from './ConcluirManutencao';
import { ManutencaoFormulario } from './ManutencaoFormulario';
import { mensagemConclusao } from './mensagens';

type Acao = { tipo: 'concluir' | 'editar' | 'cancelar' | 'excluir'; manutencao: Manutencao };
type AoAgir = (acao: Acao) => void;

type Props = {
  manutencoes: Manutencao[];
  /** Exibe o veículo (oculto na página do próprio veículo) */
  mostrarVeiculo?: boolean;
  /** Chamada depois de qualquer alteração, para recarregar os dados da página */
  aoAlterar: () => void;
};

/**
 * Lista de manutenções com as ações de cada item (concluir, editar, cancelar, excluir):
 * tabela em telas grandes e cartões no celular.
 */
export function TabelaManutencoes({ manutencoes, mostrarVeiculo = true, aoAlterar }: Props) {
  const [acao, setAcao] = useState<Acao | null>(null);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  function aposAlterar(mensagem: string) {
    setAcao(null);
    notificar('sucesso', mensagem);
    aoAlterar();
    recarregarAlertas();
  }

  return (
    <>
      <div className="hidden md:block">
        <Tabela rotulo="Manutenções">
          <thead>
            <tr>
              {mostrarVeiculo && <Th>Veículo</Th>}
              <Th>Serviço</Th>
              <Th>Programação</Th>
              <Th>Situação</Th>
              <Th className="text-right">Custo</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {manutencoes.map((manutencao) => (
              <tr key={manutencao.id} className={classesLinha}>
                {mostrarVeiculo && (
                  <Td>
                    <Veiculo manutencao={manutencao} />
                  </Td>
                )}
                <Td className="min-w-52">
                  <Servico manutencao={manutencao} />
                </Td>
                <Td className="whitespace-nowrap">
                  <Programacao manutencao={manutencao} />
                </Td>
                <Td>
                  <Situacao manutencao={manutencao} />
                </Td>
                <Td className="whitespace-nowrap text-right font-semibold text-slate-700">
                  <Custo manutencao={manutencao} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-0.5">
                    <Acoes manutencao={manutencao} aoAgir={setAcao} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {manutencoes.map((manutencao) => (
          <li key={manutencao.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <Servico manutencao={manutencao} />
              {mostrarVeiculo && <Veiculo manutencao={manutencao} compacto />}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
              <Situacao manutencao={manutencao} />
              <div className="text-right">
                <Programacao manutencao={manutencao} />
                {manutencao.status === 'REALIZADA' && (
                  <p className="font-semibold text-slate-700">
                    <Custo manutencao={manutencao} />
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-0.5">
              <Acoes manutencao={manutencao} aoAgir={setAcao} />
            </div>
          </li>
        ))}
      </ul>

      {acao?.tipo === 'concluir' && (
        <ConcluirManutencao
          manutencao={acao.manutencao}
          aoFechar={() => setAcao(null)}
          aoConcluir={(resultado) => aposAlterar(mensagemConclusao(resultado))}
        />
      )}
      {acao?.tipo === 'editar' && (
        <ManutencaoFormulario
          manutencao={acao.manutencao}
          aoFechar={() => setAcao(null)}
          aoSalvar={() => aposAlterar('Alterações salvas.')}
        />
      )}
      {acao?.tipo === 'cancelar' && (
        <Confirmacao
          titulo="Cancelar manutenção"
          rotuloConfirmar="Cancelar manutenção"
          perigo
          mensagem={
            <p>
              <strong className="text-slate-900">{acao.manutencao.descricao}</strong> (
              {formatarPlaca(acao.manutencao.veiculo.placa)}) deixará de gerar alertas e ficará no histórico como cancelada.
            </p>
          }
          aoConfirmar={async () => {
            await api.post(`/manutencoes/${acao.manutencao.id}/cancelar`);
            aposAlterar('Manutenção cancelada.');
          }}
          aoFechar={() => setAcao(null)}
        />
      )}
      {acao?.tipo === 'excluir' && (
        <Confirmacao
          titulo="Excluir manutenção"
          rotuloConfirmar="Excluir"
          perigo
          mensagem={
            <p>
              Excluir <strong className="text-slate-900">{acao.manutencao.descricao}</strong> (
              {formatarPlaca(acao.manutencao.veiculo.placa)}) definitivamente? Use esta opção para registros lançados por
              engano.
            </p>
          }
          aoConfirmar={async () => {
            await api.delete(`/manutencoes/${acao.manutencao.id}`);
            aposAlterar('Manutenção excluída.');
          }}
          aoFechar={() => setAcao(null)}
        />
      )}
    </>
  );
}

function Veiculo({ manutencao, compacto = false }: { manutencao: Manutencao; compacto?: boolean }) {
  return (
    <Link to={`/veiculos/${manutencao.veiculo.id}`} className="group inline-flex flex-col items-start gap-1">
      <PlacaVeiculo placa={manutencao.veiculo.placa} tamanho="sm" />
      {!compacto && (
        <span className="whitespace-nowrap text-xs font-medium text-slate-500 group-hover:text-marca-700">
          {manutencao.veiculo.modelo}
        </span>
      )}
    </Link>
  );
}

function Servico({ manutencao }: { manutencao: Manutencao }) {
  const intervalos = [
    manutencao.intervaloKm && formatarKm(manutencao.intervaloKm),
    manutencao.intervaloDias && plural(manutencao.intervaloDias, 'dia', 'dias'),
  ].filter(Boolean);

  return (
    <div>
      <p className="font-semibold text-slate-900">{manutencao.descricao}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <BadgeTipo tipo={manutencao.tipo} />
        {intervalos.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Repeat className="size-3" aria-hidden />a cada {intervalos.join(' ou ')}
          </span>
        )}
      </div>
    </div>
  );
}

function Programacao({ manutencao }: { manutencao: Manutencao }) {
  if (!manutencao.dataProgramada && manutencao.kmLimite === null) {
    return <span className="text-slate-400">{manutencao.status === 'PENDENTE' ? 'Sem prazo' : '—'}</span>;
  }
  return (
    <div className="space-y-0.5 text-slate-600">
      {manutencao.dataProgramada && (
        <p className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 text-slate-400" aria-hidden />
          {formatarData(manutencao.dataProgramada)}
        </p>
      )}
      {manutencao.kmLimite !== null && (
        <p className="flex items-center gap-1.5">
          <Gauge className="size-3.5 text-slate-400" aria-hidden />
          {formatarKm(manutencao.kmLimite)}
        </p>
      )}
    </div>
  );
}

function Situacao({ manutencao }: { manutencao: Manutencao }) {
  if (manutencao.status === 'PENDENTE' && manutencao.situacao) {
    return (
      <div>
        <BadgeSituacao situacao={manutencao.situacao} />
        <p className={`mt-1 text-xs ${manutencao.situacao === 'VENCIDA' ? 'font-medium text-red-600' : 'text-slate-500'}`}>
          {descreverPrazo(manutencao.diasRestantes, manutencao.kmRestantes)}
        </p>
      </div>
    );
  }
  return (
    <div>
      <BadgeStatusManutencao status={manutencao.status} />
      {manutencao.dataRealizacao && (
        <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
          em {formatarData(manutencao.dataRealizacao)}
          {manutencao.kmRealizacao !== null && ` · ${formatarKm(manutencao.kmRealizacao)}`}
        </p>
      )}
    </div>
  );
}

function Custo({ manutencao }: { manutencao: Manutencao }) {
  return manutencao.status === 'REALIZADA' ? formatarMoeda(manutencao.custo) : <span className="text-slate-300">—</span>;
}

function Acoes({ manutencao, aoAgir }: { manutencao: Manutencao; aoAgir: AoAgir }) {
  return (
    <>
      {manutencao.status === 'PENDENTE' && (
        <Botao
          variante="secundario"
          tamanho="sm"
          icone={CheckCircle2}
          className="mr-1"
          onClick={() => aoAgir({ tipo: 'concluir', manutencao })}
        >
          Concluir
        </Botao>
      )}
      {manutencao.status !== 'CANCELADA' && (
        <BotaoIcone icone={Pencil} rotulo="Editar" onClick={() => aoAgir({ tipo: 'editar', manutencao })} />
      )}
      {manutencao.status === 'PENDENTE' && (
        <BotaoIcone icone={Ban} rotulo="Cancelar" onClick={() => aoAgir({ tipo: 'cancelar', manutencao })} />
      )}
      {manutencao.status !== 'REALIZADA' && (
        <BotaoIcone icone={Trash2} rotulo="Excluir" perigo onClick={() => aoAgir({ tipo: 'excluir', manutencao })} />
      )}
    </>
  );
}
