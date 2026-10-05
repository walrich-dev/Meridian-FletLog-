import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/** Tabela com rolagem horizontal em telas pequenas. */
export function Tabela({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm" aria-label={rotulo}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 ${className}`}
      {...props}
    />
  );
}

export function Td({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3.5 align-middle text-slate-600 ${className}`} {...props} />;
}

/** Classes de uma linha da tabela (separador e destaque ao passar o mouse). */
export const classesLinha = 'border-b border-slate-100 last:border-0 transition-colors hover:bg-marca-50/40';
