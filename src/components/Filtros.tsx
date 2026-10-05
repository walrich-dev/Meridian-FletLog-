import { Search } from 'lucide-react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { classesEntrada } from './ui/Campo';

/** Barra acima das listagens com a busca e os filtros. */
export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {children}
    </div>
  );
}

export function CampoBusca({
  valor,
  aoAlterar,
  placeholder,
}: {
  valor: string;
  aoAlterar: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-80 sm:flex-none">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={valor}
        onChange={(evento) => aoAlterar(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${classesEntrada} w-full pl-9`}
      />
    </div>
  );
}

/** Seleção compacta, sem rótulo visível (o rótulo vai no aria-label). */
export function FiltroSelecao({
  rotulo,
  aoAlterar,
  children,
  ...props
}: { rotulo: string; aoAlterar: (valor: string) => void } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>) {
  return (
    <select
      aria-label={rotulo}
      onChange={(evento) => aoAlterar(evento.target.value)}
      className={`${classesEntrada} w-auto`}
      {...props}
    >
      {children}
    </select>
  );
}

/** Alternância entre duas ou mais opções (ex.: Ativos / Inativos). */
export function Alternancia<T extends string>({
  opcoes,
  valor,
  aoAlterar,
  rotulo,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoAlterar: (valor: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-xl bg-slate-100 p-1">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          aria-pressed={valor === opcao.valor}
          onClick={() => aoAlterar(opcao.valor)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            valor === opcao.valor ? 'bg-white text-marca-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}
