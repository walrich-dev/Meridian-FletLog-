import { AlertTriangle, Archive, Gauge, Pencil, Plus, RotateCcw, Truck, UserX, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { BadgeSituacao, BadgeStatusVeiculo } from '../../components/Badges';
import { CabecalhoPagina } from '../../components/CabecalhoPagina';
import { CartaoResumo, LinhaResumo } from '../../components/CartaoResumo';
import { BarraFiltros, CampoBusca, FiltroSelecao } from '../../components/Filtros';
import { useAlertas } from '../../components/layout/useAlertas';
import { PlacaVeiculo } from '../../components/PlacaVeiculo';
import { Botao, BotaoIcone } from '../../components/ui/Botao';
import { Cartao } from '../../components/ui/Cartao';
import { Carregando, EstadoVazio, MensagemErro } from '../../components/ui/Estados';
import { classesLinha, Tabela, Td, Th } from '../../components/ui/Tabela';
import { useNotificar } from '../../components/ui/useNotificar';
import { useAtraso } from '../../hooks/useAtraso';
import { useConsulta } from '../../hooks/useConsulta';
import { api, comFiltros } from '../../lib/api';
import { formatarKm, formatarPlaca } from '../../lib/formatacao';
import type { VeiculoListagem } from '../../lib/tipos';
import { AtualizarKm } from './AtualizarKm';
import { InativarVeiculo } from './InativarVeiculo';
import { VeiculoFormulario } from './VeiculoFormulario';

type Acao =
  | { tipo: 'novo' }
  | { tipo: 'editar'; veiculo: VeiculoListagem }
  | { tipo: 'km'; veiculo: VeiculoListagem }
  | { tipo: 'inativar'; veiculo: VeiculoListagem };

type AcoesDoVeiculo = { aoAgir: (acao: Acao) => void; aoReativar: (veiculo: VeiculoListagem) => void };

/** RF01: listagem, cadastro, edição e exclusão (lógica) de veículos. */
export function VeiculosPage() {
  const [parametros, setParametros] = useSearchParams();
  const status = parametros.get('status') ?? '';
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useAtraso(busca);

  const lista = useConsulta<VeiculoListagem[]>(comFiltros('/veiculos', { busca: buscaAtrasada, status }));
  // Frota ativa inteira, sem filtros, para os números de resumo
  const frota = useConsulta<VeiculoListagem[]>('/veiculos');
  const [acao, setAcao] = useState<Acao | null>(null);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  const veiculos = lista.dados;
  const todos = frota.dados ?? [];

  function aposAlterar(mensagem: string) {
    setAcao(null);
    notificar('sucesso', mensagem);
    lista.recarregar();
    frota.recarregar();
    recarregarAlertas();
  }

  async function reativar(veiculo: VeiculoListagem) {
    try {
      await api.post(`/veiculos/${veiculo.id}/reativar`);
      aposAlterar(`Veículo ${formatarPlaca(veiculo.placa)} reativado.`);
    } catch (falha) {
      notificar('erro', (falha as Error).message);
    }
  }

  const filtrarStatus = (valor: string) => setParametros(valor ? { status: valor } : {});
  const acoes: AcoesDoVeiculo = { aoAgir: setAcao, aoReativar: reativar };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Operação"
        titulo="Veículos"
        descricao="Frota cadastrada, quilometragem e situação das manutenções."
        acoes={
          <Botao icone={Plus} onClick={() => setAcao({ tipo: 'novo' })}>
            Novo veículo
          </Botao>
        }
      />

      <LinhaResumo>
        <CartaoResumo
          rotulo="Frota ativa"
          valor={todos.length}
          icone={Truck}
          detalhe="Ativos e em manutenção"
          aoClicar={() => filtrarStatus('')}
          ativo={status === ''}
        />
        <CartaoResumo
          rotulo="Em manutenção"
          valor={todos.filter((v) => v.status === 'EM_MANUTENCAO').length}
          icone={Wrench}
          tom="amarelo"
          detalhe="Parados na oficina"
          aoClicar={() => filtrarStatus('EM_MANUTENCAO')}
          ativo={status === 'EM_MANUTENCAO'}
        />
        <CartaoResumo
          rotulo="Manutenção vencida"
          valor={todos.filter((v) => v.situacaoManutencao === 'VENCIDA').length}
          icone={AlertTriangle}
          tom={todos.some((v) => v.situacaoManutencao === 'VENCIDA') ? 'vermelho' : 'verde'}
          detalhe="Exigem atenção imediata"
        />
        <CartaoResumo
          rotulo="Sem motorista"
          valor={todos.filter((v) => v.motorista === null).length}
          icone={UserX}
          tom="cinza"
          detalhe="Sem responsável vinculado"
        />
      </LinhaResumo>

      <BarraFiltros>
        <CampoBusca valor={busca} aoAlterar={setBusca} placeholder="Buscar por placa, modelo ou motorista" />
        <FiltroSelecao rotulo="Filtrar por status" value={status} aoAlterar={filtrarStatus}>
          <option value="">Ativos e em manutenção</option>
          <option value="ATIVO">Somente ativos</option>
          <option value="EM_MANUTENCAO">Em manutenção</option>
          <option value="INATIVO">Inativos (excluídos)</option>
        </FiltroSelecao>
        {veiculos && (
          <p className="ml-auto text-sm text-slate-500">
            {veiculos.length} {veiculos.length === 1 ? 'veículo' : 'veículos'}
          </p>
        )}
      </BarraFiltros>

      {lista.erro && <MensagemErro mensagem={lista.erro} aoTentarDeNovo={lista.recarregar} />}

      <Cartao semEspaco>
        {!veiculos && lista.carregando ? (
          <Carregando />
        ) : !veiculos?.length ? (
          <EstadoVazio
            icone={Truck}
            titulo={busca || status ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
            descricao={busca || status ? 'Confira a busca e o filtro de status.' : 'Cadastre o primeiro veículo da frota.'}
            acao={
              !busca &&
              !status && (
                <Botao icone={Plus} onClick={() => setAcao({ tipo: 'novo' })}>
                  Novo veículo
                </Botao>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TabelaVeiculos veiculos={veiculos} {...acoes} />
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {veiculos.map((veiculo) => (
                <CartaoVeiculo key={veiculo.id} veiculo={veiculo} {...acoes} />
              ))}
            </ul>
          </>
        )}
      </Cartao>

      {(acao?.tipo === 'novo' || acao?.tipo === 'editar') && (
        <VeiculoFormulario
          veiculo={acao.tipo === 'editar' ? acao.veiculo : undefined}
          aoFechar={() => setAcao(null)}
          aoSalvar={(salvo) =>
            aposAlterar(acao.tipo === 'novo' ? `Veículo ${formatarPlaca(salvo.placa)} cadastrado.` : 'Alterações salvas.')
          }
        />
      )}
      {acao?.tipo === 'km' && (
        <AtualizarKm
          veiculo={acao.veiculo}
          aoFechar={() => setAcao(null)}
          aoSalvar={(salvo) => aposAlterar(`Quilometragem atualizada: ${formatarKm(salvo.kmAtual)}.`)}
        />
      )}
      {acao?.tipo === 'inativar' && (
        <InativarVeiculo
          veiculo={acao.veiculo}
          aoFechar={() => setAcao(null)}
          aoInativar={() => aposAlterar(`Veículo ${formatarPlaca(acao.veiculo.placa)} inativado.`)}
        />
      )}
    </>
  );
}

function TabelaVeiculos({ veiculos, aoAgir, aoReativar }: { veiculos: VeiculoListagem[] } & AcoesDoVeiculo) {
  return (
    <Tabela rotulo="Veículos">
      <thead>
        <tr>
          <Th>Veículo</Th>
          <Th>Motorista</Th>
          <Th className="text-right">Quilometragem</Th>
          <Th>Status</Th>
          <Th>Manutenções</Th>
          <Th className="text-right">Ações</Th>
        </tr>
      </thead>
      <tbody>
        {veiculos.map((veiculo) => (
          <tr key={veiculo.id} className={classesLinha}>
            <Td>
              <Link to={`/veiculos/${veiculo.id}`} className="group flex items-center gap-3">
                <PlacaVeiculo placa={veiculo.placa} />
                <span>
                  <span className="block font-semibold text-slate-900 group-hover:text-marca-700">
                    {veiculo.marca} {veiculo.modelo}
                  </span>
                  <span className="block text-xs text-slate-500">Adquirido em {veiculo.anoAquisicao}</span>
                </span>
              </Link>
            </Td>
            <Td>
              <Motorista veiculo={veiculo} />
            </Td>
            <Td className="whitespace-nowrap text-right font-semibold text-slate-700">{formatarKm(veiculo.kmAtual)}</Td>
            <Td>
              <BadgeStatusVeiculo status={veiculo.status} />
            </Td>
            <Td>
              <SituacaoManutencao veiculo={veiculo} />
            </Td>
            <Td>
              <div className="flex justify-end gap-0.5">
                <Acoes veiculo={veiculo} aoAgir={aoAgir} aoReativar={aoReativar} />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Tabela>
  );
}

/** Versão em cartão de cada veículo, usada no celular. */
function CartaoVeiculo({ veiculo, aoAgir, aoReativar }: { veiculo: VeiculoListagem } & AcoesDoVeiculo) {
  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/veiculos/${veiculo.id}`} className="flex items-center gap-3">
          <PlacaVeiculo placa={veiculo.placa} />
          <span className="font-semibold text-slate-900">
            {veiculo.marca} {veiculo.modelo}
          </span>
        </Link>
        <BadgeStatusVeiculo status={veiculo.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Motorista veiculo={veiculo} />
        <span className="font-semibold text-slate-700">{formatarKm(veiculo.kmAtual)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <SituacaoManutencao veiculo={veiculo} />
        <div className="flex gap-0.5">
          <Acoes veiculo={veiculo} aoAgir={aoAgir} aoReativar={aoReativar} />
        </div>
      </div>
    </li>
  );
}

function Motorista({ veiculo }: { veiculo: VeiculoListagem }) {
  return veiculo.motorista ? (
    <span className="flex items-center gap-2.5">
      <Avatar nome={veiculo.motorista.nome} tamanho="sm" />
      <span className="font-medium text-slate-700">{veiculo.motorista.nome}</span>
    </span>
  ) : (
    <span className="text-slate-400">Sem motorista</span>
  );
}

function SituacaoManutencao({ veiculo }: { veiculo: VeiculoListagem }) {
  if (veiculo.situacaoManutencao) return <BadgeSituacao situacao={veiculo.situacaoManutencao} />;
  return <span className="text-xs text-slate-400">{veiculo.status === 'INATIVO' ? '—' : 'Nenhuma programada'}</span>;
}

function Acoes({ veiculo, aoAgir, aoReativar }: { veiculo: VeiculoListagem } & AcoesDoVeiculo) {
  if (veiculo.status === 'INATIVO') {
    return (
      <Botao variante="fantasma" tamanho="sm" icone={RotateCcw} onClick={() => aoReativar(veiculo)}>
        Reativar
      </Botao>
    );
  }
  return (
    <>
      <BotaoIcone icone={Gauge} rotulo="Atualizar quilometragem" onClick={() => aoAgir({ tipo: 'km', veiculo })} />
      <BotaoIcone icone={Pencil} rotulo="Editar" onClick={() => aoAgir({ tipo: 'editar', veiculo })} />
      <BotaoIcone icone={Archive} rotulo="Inativar" perigo onClick={() => aoAgir({ tipo: 'inativar', veiculo })} />
    </>
  );
}
