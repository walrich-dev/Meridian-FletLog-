import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  titulo?: ReactNode;
  descricao?: ReactNode;
  /** Ícone ao lado do título */
  icone?: LucideIcon;
  /** Botões ou links à direita do título */
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove o espaçamento interno (ex.: para tabelas que ocupam o cartão inteiro) */
  semEspaco?: boolean;
};

/** Bloco branco com borda, usado para agrupar conteúdo nas páginas. */
export function Cartao({ titulo, descricao, icone: Icone, acoes, children, className = '', semEspaco = false }: Props) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            {Icone && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600">
                <Icone className="size-4.5" aria-hidden />
              </span>
            )}
            <div>
              {titulo && <h2 className="font-bold text-slate-900">{titulo}</h2>}
              {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
            </div>
          </div>
          {acoes}
        </header>
      )}
      <div className={semEspaco ? '' : 'p-5 sm:p-6'}>{children}</div>
    </section>
  );
}
