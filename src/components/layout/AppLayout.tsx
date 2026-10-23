import { LayoutDashboard, LogOut, Settings, Truck, UserCog, Users, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth, useUsuario } from '../../auth/useAuth';
import { ROTULO_PERFIL } from '../../lib/formatacao';
import type { Perfil } from '../../lib/tipos';
import { Avatar } from '../Avatar';
import { Marca } from '../Marca';
import { AlertasProvider } from './AlertasProvider';
import { Cabecalho } from './Cabecalho';
import { StatusApi } from './StatusApi';
import { useAlertas } from './useAlertas';

type ItemMenu = { para: string; rotulo: string; Icone: typeof Truck; perfis?: Perfil[]; contarAlertas?: boolean };

const SECOES: { titulo: string; itens: ItemMenu[] }[] = [
  { titulo: 'Visão geral', itens: [{ para: '/', rotulo: 'Dashboard', Icone: LayoutDashboard }] },
  {
    titulo: 'Operação',
    itens: [
      { para: '/veiculos', rotulo: 'Veículos', Icone: Truck },
      { para: '/motoristas', rotulo: 'Motoristas', Icone: Users },
      { para: '/manutencoes', rotulo: 'Manutenções', Icone: Wrench, contarAlertas: true },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { para: '/usuarios', rotulo: 'Usuários', Icone: UserCog, perfis: ['ADMIN'] },
      { para: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
    ],
  },
];

/**
 * Estrutura das páginas internas: menu lateral fixo (no celular, uma gaveta
 * aberta pelo botão do cabeçalho), cabeçalho e a área de cada página (<Outlet />).
 */
export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <AlertasProvider>
      <div className="min-h-screen">
        {/* Fundo escuro atrás da gaveta, no celular */}
        {menuAberto && (
          <div className="fixed inset-0 z-30 bg-marca-950/60 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuAberto(false)} aria-hidden />
        )}

        <MenuLateral aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

        <div className="flex min-h-screen flex-col lg:pl-80">
          <Cabecalho aoAbrirMenu={() => setMenuAberto(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AlertasProvider>
  );
}

function MenuLateral({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const usuario = useUsuario();
  const { sair } = useAuth();
  const { alertas } = useAlertas();
  const alertasManutencao = alertas?.manutencoes.length ?? 0;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col bg-linear-to-b from-marca-950 via-[#132354] to-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${
        aberto ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Menu principal"
    >
      <div className="flex items-center justify-between px-6 pb-7 pt-8">
        <Link to="/" onClick={aoFechar}>
          <Marca tom="claro" tamanho="md" legenda />
        </Link>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-lg p-1.5 text-marca-200 hover:bg-white/10 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4">
        {SECOES.map((secao) => {
          const itens = secao.itens.filter((item) => !item.perfis || item.perfis.includes(usuario.perfil));
          if (itens.length === 0) return null;
          return (
            <div key={secao.titulo}>
              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-marca-300/60">{secao.titulo}</p>
              <ul className="space-y-1.5">
                {itens.map(({ para, rotulo, Icone, contarAlertas }) => (
                  <li key={para}>
                    <NavLink
                      to={para}
                      end={para === '/'}
                      onClick={aoFechar}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition-colors ${
                          isActive ? 'bg-white/12 text-white' : 'text-marca-100/75 hover:bg-white/6 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute inset-y-2 -left-4 w-1 rounded-r-full bg-marca-400" aria-hidden />}
                          <Icone className={`size-5 ${isActive ? 'text-marca-300' : ''}`} aria-hidden />
                          {rotulo}
                          {contarAlertas && alertasManutencao > 0 && (
                            <span
                              className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
                              aria-label={`${alertasManutencao} alertas`}
                            >
                              {alertasManutencao}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 p-4">
        <StatusApi />
        <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-3 ring-1 ring-white/10">
          <Avatar nome={usuario.nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{usuario.nome}</p>
            <p className="truncate text-sm text-marca-200/70">{ROTULO_PERFIL[usuario.perfil]}</p>
          </div>
          <button
            type="button"
            onClick={() => sair()}
            className="rounded-lg p-2 text-marca-200 hover:bg-white/10 hover:text-white"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
