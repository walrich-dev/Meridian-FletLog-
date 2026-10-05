import type { ReactNode } from 'react';

type Props = {
  titulo: ReactNode;
  /** Texto pequeno acima do título (ex.: a seção do menu) */
  sobretitulo?: string;
  descricao?: ReactNode;
  /** Botões exibidos à direita do título (ex.: "Novo veículo") */
  acoes?: ReactNode;
};

/** Título padrão das páginas do painel. */
export function CabecalhoPagina({ titulo, sobretitulo, descricao, acoes }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div>
        {sobretitulo && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-marca-600">{sobretitulo}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-sm text-slate-500 sm:text-base">{descricao}</p>}
      </div>
      {acoes}
    </div>
  );
}
