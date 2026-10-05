import { formatarPlaca } from '../lib/formatacao';

const TAMANHOS = {
  sm: { faixa: 'h-1.5', texto: 'px-1.5 text-xs tracking-[0.08em]' },
  md: { faixa: 'h-2', texto: 'px-2 py-0.5 text-sm tracking-[0.1em]' },
  lg: { faixa: 'h-3', texto: 'px-3 py-1 text-2xl tracking-[0.12em]' },
};

/** Placa do veículo desenhada como uma placa Mercosul (faixa azul no topo). */
export function PlacaVeiculo({ placa, tamanho = 'md' }: { placa: string; tamanho?: keyof typeof TAMANHOS }) {
  const estilo = TAMANHOS[tamanho];
  return (
    <span className="inline-flex shrink-0 flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-xs">
      <span className={`block bg-marca-700 ${estilo.faixa}`} aria-hidden />
      <span className={`font-mono font-bold leading-tight text-slate-900 ${estilo.texto}`}>{formatarPlaca(placa)}</span>
    </span>
  );
}
