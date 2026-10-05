import { Car, IdCard, Pencil, Plus, RotateCcw, ShieldAlert, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { BadgeCnh } from '../../components/Badges';
import { CabecalhoPagina } from '../../components/CabecalhoPagina';
import { CartaoResumo, LinhaResumo } from '../../components/CartaoResumo';
import { Alternancia, BarraFiltros, CampoBusca } from '../../components/Filtros';
import { useAlertas } from '../../components/layout/useAlertas';
import { PlacaVeiculo } from '../../components/PlacaVeiculo';
import { Badge } from '../../components/ui/Badge';
import { Botao, BotaoIcone } from '../../components/ui/Botao';
import { Cartao } from '../../components/ui/Cartao';
import { Confirmacao } from '../../components/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../components/ui/Estados';
import { classesLinha, Tabela, Td, Th } from '../../components/ui/Tabela';
import { useNotificar } from '../../components/ui/useNotificar';
import { useAtraso } from '../../hooks/useAtraso';
import { useConsulta } from '../../hooks/useConsulta';
import { api, comFiltros } from '../../lib/api';
import { descreverValidadeCnh, formatarCpf, formatarData, formatarPlaca, formatarTelefone } from '../../lib/formatacao';
import type { Motorista } from '../../lib/tipos';
import { MotoristaFormulario } from './MotoristaFormulario';

type Acao = { tipo: 'novo' } | { tipo: 'editar'; motorista: Motorista } | { tipo: 'inativar'; motorista: Motorista };

type AcoesDoMotorista = { aoAgir: (acao: Acao) => void; aoReativar: (motorista: Motorista) => void };

/** RF01: listagem, cadastro, edição e exclusão (lógica) de motoristas. */
export function MotoristasPage() {
  const [parametros, setParametros] = useSearchParams();
  const ativos = parametros.get('ativo') !== 'false';
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useAtraso(busca);

  const lista = useConsulta<Motorista[]>(
    comFiltros('/motoristas', { busca: buscaAtrasada, ativo: ativos ? undefined : 'false' }),
  );
  // Todos os motoristas ativos, sem busca, para os números de resumo
  const equipe = useConsulta<Motorista[]>('/motoristas');
  const [acao, setAcao] = useState<Acao | null>(null);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  const motoristas = lista.dados;
  const todos = equipe.dados ?? [];
  const cnhVencidas = todos.filter((m) => m.situacaoCnh === 'VENCIDA').length;
  const cnhVencendo = todos.filter((m) => m.situacaoCnh === 'VENCENDO').length;

  function aposAlterar(mensagem: string) {
    setAcao(null);
    notificar('sucesso', mensagem);
    lista.recarregar();
    equipe.recarregar();
    recarregarAlertas();
  }

  async function reativar(motorista: Motorista) {
    try {
      await api.post(`/motoristas/${motorista.id}/reativar`);
      aposAlterar(`${motorista.nome} foi reativado(a).`);
    } catch (falha) {
      notificar('erro', (falha as Error).message);
    }
  }

  const acoes: AcoesDoMotorista = { aoAgir: setAcao, aoReativar: reativar };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Operação"
        titulo="Motoristas"
        descricao="Cadastro dos motoristas, validade da CNH e veículo sob responsabilidade."
        acoes={
          <Botao icone={Plus} onClick={() => setAcao({ tipo: 'novo' })}>
            Novo motorista
          </Botao>
        }
      />

      <LinhaResumo>
        <CartaoResumo rotulo="Motoristas ativos" valor={todos.length} icone={Users} detalhe="Equipe disponível" />
        <CartaoResumo
          rotulo="CNH vencida"
          valor={cnhVencidas}
          icone={ShieldAlert}
          tom={cnhVencidas ? 'vermelho' : 'verde'}
          detalhe={cnhVencidas ? 'Não podem dirigir' : 'Nenhuma vencida'}
        />
        <CartaoResumo
          rotulo="CNH vencendo"
          valor={cnhVencendo}
          icone={IdCard}
          tom={cnhVencendo ? 'amarelo' : 'verde'}
          detalhe="Renovação próxima"
        />
        <CartaoResumo
          rotulo="Sem veículo"
          valor={todos.filter((m) => m.veiculo === null).length}
          icone={Car}
          tom="cinza"
          detalhe="Disponíveis para vincular"
        />
      </LinhaResumo>

      <BarraFiltros>
        <CampoBusca valor={busca} aoAlterar={setBusca} placeholder="Buscar por nome, CPF ou CNH" />
        <Alternancia
          rotulo="Situação do cadastro"
          valor={ativos ? 'ativos' : 'inativos'}
          aoAlterar={(valor) => setParametros(valor === 'inativos' ? { ativo: 'false' } : {})}
          opcoes={[
            { valor: 'ativos', rotulo: 'Ativos' },
            { valor: 'inativos', rotulo: 'Inativos' },
          ]}
        />
        {motoristas && (
          <p className="ml-auto text-sm text-slate-500">
            {motoristas.length} {motoristas.length === 1 ? 'motorista' : 'motoristas'}
          </p>
        )}
      </BarraFiltros>

      {lista.erro && <MensagemErro mensagem={lista.erro} aoTentarDeNovo={lista.recarregar} />}

      <Cartao semEspaco>
        {!motoristas && lista.carregando ? (
          <Carregando />
        ) : !motoristas?.length ? (
          <EstadoVazio
            icone={Users}
            titulo={busca ? 'Nenhum motorista encontrado' : ativos ? 'Nenhum motorista cadastrado' : 'Nenhum motorista inativo'}
            descricao={busca ? 'Confira o termo buscado.' : undefined}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TabelaMotoristas motoristas={motoristas} {...acoes} />
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {motoristas.map((motorista) => (
                <CartaoMotorista key={motorista.id} motorista={motorista} {...acoes} />
              ))}
            </ul>
          </>
        )}
      </Cartao>

      {(acao?.tipo === 'novo' || acao?.tipo === 'editar') && (
        <MotoristaFormulario
          motorista={acao.tipo === 'editar' ? acao.motorista : undefined}
          aoFechar={() => setAcao(null)}
          aoSalvar={(salvo) => aposAlterar(acao.tipo === 'novo' ? `${salvo.nome} foi cadastrado(a).` : 'Alterações salvas.')}
        />
      )}

      {acao?.tipo === 'inativar' && (
        <Confirmacao
          titulo="Inativar motorista"
          perigo
          rotuloConfirmar="Inativar"
          mensagem={
            <>
              <p>
                <strong className="text-slate-900">{acao.motorista.nome}</strong> sairá da lista de motoristas ativos.
                {acao.motorista.veiculo &&
                  ` Deixará de ser responsável pelo veículo ${formatarPlaca(acao.motorista.veiculo.placa)}.`}
              </p>
              <p className="mt-2 text-slate-500">O cadastro é mantido e pode ser reativado depois.</p>
            </>
          }
          aoConfirmar={async () => {
            await api.delete(`/motoristas/${acao.motorista.id}`);
            aposAlterar(`${acao.motorista.nome} foi inativado(a).`);
          }}
          aoFechar={() => setAcao(null)}
        />
      )}
    </>
  );
}

function TabelaMotoristas({ motoristas, aoAgir, aoReativar }: { motoristas: Motorista[] } & AcoesDoMotorista) {
  return (
    <Tabela rotulo="Motoristas">
      <thead>
        <tr>
          <Th>Motorista</Th>
          <Th>CPF</Th>
          <Th>CNH</Th>
          <Th>Validade da CNH</Th>
          <Th>Veículo</Th>
          <Th className="text-right">Ações</Th>
        </tr>
      </thead>
      <tbody>
        {motoristas.map((motorista) => (
          <tr key={motorista.id} className={classesLinha}>
            <Td>
              <Identificacao motorista={motorista} />
            </Td>
            <Td className="whitespace-nowrap">{formatarCpf(motorista.cpf)}</Td>
            <Td className="whitespace-nowrap">
              <span className="mr-2">{motorista.cnh}</span>
              <Badge tom="marca">Cat. {motorista.categoriaCnh}</Badge>
            </Td>
            <Td>
              <Validade motorista={motorista} />
            </Td>
            <Td>
              <VeiculoVinculado motorista={motorista} />
            </Td>
            <Td>
              <div className="flex justify-end gap-0.5">
                <Acoes motorista={motorista} aoAgir={aoAgir} aoReativar={aoReativar} />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Tabela>
  );
}

/** Versão em cartão de cada motorista, usada no celular. */
function CartaoMotorista({ motorista, aoAgir, aoReativar }: { motorista: Motorista } & AcoesDoMotorista) {
  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <Identificacao motorista={motorista} />
        <VeiculoVinculado motorista={motorista} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>CPF {formatarCpf(motorista.cpf)}</span>
        <span>
          CNH {motorista.cnh} · cat. {motorista.categoriaCnh}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Validade motorista={motorista} />
        <div className="flex gap-0.5">
          <Acoes motorista={motorista} aoAgir={aoAgir} aoReativar={aoReativar} />
        </div>
      </div>
    </li>
  );
}

function Identificacao({ motorista }: { motorista: Motorista }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar nome={motorista.nome} />
      <span>
        <span className="block font-semibold text-slate-900">{motorista.nome}</span>
        <span className="block text-xs text-slate-500">{formatarTelefone(motorista.telefone)}</span>
      </span>
    </span>
  );
}

function Validade({ motorista }: { motorista: Motorista }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-700">{formatarData(motorista.validadeCnh)}</span>
        {motorista.situacaoCnh !== 'VALIDA' && <BadgeCnh situacao={motorista.situacaoCnh} />}
      </div>
      {motorista.situacaoCnh !== 'VALIDA' && (
        <p className="mt-0.5 text-xs text-slate-500">{descreverValidadeCnh(motorista.diasParaVencer)}</p>
      )}
    </div>
  );
}

function VeiculoVinculado({ motorista }: { motorista: Motorista }) {
  return motorista.veiculo ? (
    <Link to={`/veiculos/${motorista.veiculo.id}`} className="inline-block hover:opacity-80" title={motorista.veiculo.modelo}>
      <PlacaVeiculo placa={motorista.veiculo.placa} tamanho="sm" />
    </Link>
  ) : (
    <span className="text-sm text-slate-400">Sem veículo</span>
  );
}

function Acoes({ motorista, aoAgir, aoReativar }: { motorista: Motorista } & AcoesDoMotorista) {
  if (!motorista.ativo) {
    return (
      <Botao variante="fantasma" tamanho="sm" icone={RotateCcw} onClick={() => aoReativar(motorista)}>
        Reativar
      </Botao>
    );
  }
  return (
    <>
      <BotaoIcone icone={Pencil} rotulo="Editar" onClick={() => aoAgir({ tipo: 'editar', motorista })} />
      <BotaoIcone icone={UserX} rotulo="Inativar" perigo onClick={() => aoAgir({ tipo: 'inativar', motorista })} />
    </>
  );
}
