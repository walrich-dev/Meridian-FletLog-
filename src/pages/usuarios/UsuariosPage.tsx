import { Pencil, Plus, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useState } from 'react';
import { useUsuario } from '../../auth/useAuth';
import { Avatar } from '../../components/Avatar';
import { CabecalhoPagina } from '../../components/CabecalhoPagina';
import { CartaoResumo, LinhaResumo } from '../../components/CartaoResumo';
import { Badge } from '../../components/ui/Badge';
import { Botao, BotaoIcone } from '../../components/ui/Botao';
import { Cartao } from '../../components/ui/Cartao';
import { Carregando, EstadoVazio, MensagemErro } from '../../components/ui/Estados';
import { classesLinha, Tabela, Td, Th } from '../../components/ui/Tabela';
import { useNotificar } from '../../components/ui/useNotificar';
import { useConsulta } from '../../hooks/useConsulta';
import { formatarData, ROTULO_PERFIL } from '../../lib/formatacao';
import type { UsuarioCadastro } from '../../lib/tipos';
import { UsuarioFormulario } from './UsuarioFormulario';

/** Gestão de quem acessa o sistema (RNF01). Visível só para administradores. */
export function UsuariosPage() {
  const eu = useUsuario();
  const { dados: usuarios, erro, carregando, recarregar } = useConsulta<UsuarioCadastro[]>('/usuarios');
  const [formulario, setFormulario] = useState<{ usuario?: UsuarioCadastro } | null>(null);
  const notificar = useNotificar();
  const editar = (usuario: UsuarioCadastro) => setFormulario({ usuario });
  const lista = usuarios ?? [];

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Administração"
        titulo="Usuários"
        descricao="Pessoas com acesso ao Meridian e seus perfis."
        acoes={
          <Botao icone={Plus} onClick={() => setFormulario({})}>
            Novo usuário
          </Botao>
        }
      />

      <LinhaResumo>
        <CartaoResumo rotulo="Usuários ativos" valor={lista.filter((u) => u.ativo).length} icone={Users} />
        <CartaoResumo
          rotulo="Administradores"
          valor={lista.filter((u) => u.ativo && u.perfil === 'ADMIN').length}
          icone={ShieldCheck}
          detalhe="Gerenciam usuários e configurações"
        />
        <CartaoResumo
          rotulo="Gestores de frota"
          valor={lista.filter((u) => u.ativo && u.perfil === 'GESTOR').length}
          icone={UserCog}
          detalhe="Operação do dia a dia"
        />
        <CartaoResumo rotulo="Inativos" valor={lista.filter((u) => !u.ativo).length} icone={Users} tom="cinza" detalhe="Sem acesso ao sistema" />
      </LinhaResumo>

      {erro && <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} />}

      <Cartao semEspaco>
        {!usuarios && carregando ? (
          <Carregando />
        ) : !usuarios?.length ? (
          <EstadoVazio icone={UserCog} titulo="Nenhum usuário cadastrado" />
        ) : (
          <>
            <div className="hidden md:block">
              <Tabela rotulo="Usuários">
                <thead>
                  <tr>
                    <Th>Usuário</Th>
                    <Th>Perfil</Th>
                    <Th>Situação</Th>
                    <Th>Cadastrado em</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className={classesLinha}>
                      <Td>
                        <Identificacao usuario={usuario} ehVoce={usuario.id === eu.id} />
                      </Td>
                      <Td>
                        <Perfil usuario={usuario} />
                      </Td>
                      <Td>
                        <Situacao usuario={usuario} />
                      </Td>
                      <Td>{formatarData(usuario.criadoEm)}</Td>
                      <Td className="text-right">
                        <BotaoIcone icone={Pencil} rotulo="Editar" onClick={() => editar(usuario)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {usuarios.map((usuario) => (
                <li key={usuario.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Identificacao usuario={usuario} ehVoce={usuario.id === eu.id} />
                    <div className="flex flex-wrap gap-2">
                      <Perfil usuario={usuario} />
                      <Situacao usuario={usuario} />
                    </div>
                  </div>
                  <BotaoIcone icone={Pencil} rotulo="Editar" onClick={() => editar(usuario)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Cartao>

      {formulario && (
        <UsuarioFormulario
          usuario={formulario.usuario}
          ehOProprio={formulario.usuario?.id === eu.id}
          aoFechar={() => setFormulario(null)}
          aoSalvar={(salvo) => {
            setFormulario(null);
            notificar('sucesso', formulario.usuario ? 'Alterações salvas.' : `Usuário ${salvo.nome} cadastrado.`);
            recarregar();
          }}
        />
      )}
    </>
  );
}

function Identificacao({ usuario, ehVoce }: { usuario: UsuarioCadastro; ehVoce: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar nome={usuario.nome} />
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">
          {usuario.nome}
          {ehVoce && <span className="ml-2 text-xs font-medium text-marca-600">(você)</span>}
        </span>
        <span className="block truncate text-xs text-slate-500">{usuario.email}</span>
      </span>
    </span>
  );
}

const Perfil = ({ usuario }: { usuario: UsuarioCadastro }) => (
  <Badge tom={usuario.perfil === 'ADMIN' ? 'marca' : 'azul'}>{ROTULO_PERFIL[usuario.perfil]}</Badge>
);

const Situacao = ({ usuario }: { usuario: UsuarioCadastro }) => (
  <Badge tom={usuario.ativo ? 'verde' : 'cinza'} ponto>
    {usuario.ativo ? 'Ativo' : 'Inativo'}
  </Badge>
);
