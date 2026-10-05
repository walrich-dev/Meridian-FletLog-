import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tom = 'marca' | 'verde' | 'amarelo' | 'vermelho' | 'cinza';

const ICONE: Record<Tom, string> = {
  marca: 'bg-marca-50 text-marca-600',
  verde: 'bg-emerald-50 text-emerald-600',
  amarelo: 'bg-amber-50 text-amber-600',
  vermelho: 'bg-red-50 text-red-600',
  cinza: 'bg-slate-100 text-slate-500',
};

type Props = {
  rotulo: string;
  valor: ReactNode;
  icone: LucideIcon;
  /** Cor do ícone: azul (padrão) ou cor de status quando o número indica um problema */
  tom?: Tom;
  detalhe?: ReactNode;
  /** Quando informado, o cartão vira um filtro clicável da listagem */
  aoClicar?: () => void;
  ativo?: boolean;
};

/** Número de resumo no topo das listagens (ex.: "Em manutenção: 1"). */
export function CartaoResumo({ rotulo, valor, icone: Icone, tom = 'marca', detalhe, aoClicar, ativo = false }: Props) {
  const conteudo = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-11 ${ICONE[tom]}`}>
        <Icone className="size-5" aria-hidden />
      </span>
      <span className="w-full min-w-0 text-left">
        <span className="block text-sm font-medium leading-snug text-slate-500 sm:truncate">{rotulo}</span>
        <span className="block text-2xl font-bold tracking-tight text-slate-900">{valor}</span>
        {detalhe && <span className="hidden truncate text-xs text-slate-500 sm:block">{detalhe}</span>}
      </span>
    </>
  );

  const classes = `flex w-full flex-col items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:gap-4 ${
    ativo ? 'border-marca-500 ring-4 ring-marca-500/10' : 'border-slate-200/80'
  }`;

  return aoClicar ? (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`${classes} transition hover:border-marca-300 hover:shadow-md hover:shadow-marca-900/5 focus-visible:outline-2 focus-visible:outline-marca-600`}
    >
      {conteudo}
    </button>
  ) : (
    <div className={classes}>{conteudo}</div>
  );
}

/** Grade com os cartões de resumo. */
export function LinhaResumo({ children }: { children: ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>;
}
