import type { ReactNode } from 'react';

export type Tom = 'verde' | 'amarelo' | 'vermelho' | 'cinza' | 'azul' | 'marca';

const TONS: Record<Tom, { fundo: string; ponto: string }> = {
  verde: { fundo: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', ponto: 'bg-emerald-500' },
  amarelo: { fundo: 'bg-amber-50 text-amber-800 ring-amber-600/20', ponto: 'bg-amber-500' },
  vermelho: { fundo: 'bg-red-50 text-red-700 ring-red-600/15', ponto: 'bg-red-500' },
  cinza: { fundo: 'bg-slate-100 text-slate-600 ring-slate-500/15', ponto: 'bg-slate-400' },
  azul: { fundo: 'bg-sky-50 text-sky-700 ring-sky-600/15', ponto: 'bg-sky-500' },
  marca: { fundo: 'bg-marca-50 text-marca-700 ring-marca-600/15', ponto: 'bg-marca-500' },
};

/**
 * Etiqueta colorida de status. A cor reforça o texto, nunca o substitui.
 * `ponto` mostra um marcador antes do texto (usado nos status).
 */
export function Badge({ tom, ponto = false, children }: { tom: Tom; ponto?: boolean; children: ReactNode }) {
  const { fundo, ponto: corPonto } = TONS[tom];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${fundo}`}
    >
      {ponto && <span className={`size-1.5 rounded-full ${corPonto}`} aria-hidden />}
      {children}
    </span>
  );
}
