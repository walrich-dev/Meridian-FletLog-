import { Bell, CheckCircle2, IdCard, Menu, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useUsuario } from '../../auth/useAuth';
import { descreverPrazo, descreverValidadeCnh, formatarPlaca, ROTULO_PERFIL } from '../../lib/formatacao';
import { Avatar } from '../Avatar';
import { useAlertas } from './useAlertas';

const formatoData = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Barra do topo: data, alertas e usuário. No celular, também abre o menu. */
export function Cabecalho({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const usuario = useUsuario();
  const [dataDeHoje] = useState(() => {
    const texto = formatoData.format(new Date());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <p className="hidden text-sm font-medium text-slate-500 sm:block">{dataDeHoje}</p>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <SinoDeAlertas />
        <div className="h-8 w-px bg-slate-200" aria-hidden />
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-slate-900">{usuario.nome}</p>
            <p className="text-xs text-slate-500">{ROTULO_PERFIL[usuario.perfil]}</p>
          </div>
          <Avatar nome={usuario.nome} tamanho="sm" />
        </div>
      </div>
    </header>
  );
}

/** Sino com o total de alertas; ao clicar, mostra os mais urgentes. */
function SinoDeAlertas() {
  const { alertas } = useAlertas();
  const [aberto, setAberto] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const total = alertas?.resumo.total ?? 0;

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (!area.current?.contains(evento.target as Node)) setAberto(false);
    };
    const fecharComEsc = (evento: KeyboardEvent) => evento.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);

  return (
    <div ref={area} className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className={`relative rounded-xl p-2.5 transition-colors ${
          aberto ? 'bg-marca-50 text-marca-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
        aria-label={total ? `${total} alertas de manutenção e CNH` : 'Nenhum alerta'}
        aria-expanded={aberto}
      >
        <Bell className="size-5" aria-hidden />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-marca-950/15 ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-900">Alertas</p>
            {total > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{total} pendentes</span>
            )}
          </div>

          {total === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <CheckCircle2 className="size-5 text-emerald-500" aria-hidden />
              Tudo em dia: nenhum alerta no momento.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {alertas?.manutencoes.map((manutencao) => (
                <li key={`m${manutencao.id}`}>
                  <Link
                    to={`/veiculos/${manutencao.veiculo.id}`}
                    onClick={fechar}
                    className="flex gap-3 px-4 py-3 hover:bg-marca-50/50"
                  >
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                        manutencao.situacao === 'VENCIDA' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <Wrench className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{manutencao.descricao}</span>
                      <span className="block text-xs text-slate-500">
                        {formatarPlaca(manutencao.veiculo.placa)} · {descreverPrazo(manutencao.diasRestantes, manutencao.kmRestantes)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {alertas?.cnh.map((motorista) => (
                <li key={`c${motorista.id}`}>
                  <Link to="/motoristas" onClick={fechar} className="flex gap-3 px-4 py-3 hover:bg-marca-50/50">
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                        motorista.situacaoCnh === 'VENCIDA' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <IdCard className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">CNH de {motorista.nome}</span>
                      <span className="block text-xs text-slate-500">{descreverValidadeCnh(motorista.diasParaVencer)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/#alertas"
            onClick={fechar}
            className="block border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-center text-sm font-semibold text-marca-700 hover:bg-marca-50"
          >
            Ver no dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
