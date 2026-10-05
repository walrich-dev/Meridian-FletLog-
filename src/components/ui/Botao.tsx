import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma' | 'claro';
type Tamanho = 'md' | 'sm';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-marca-600 text-white shadow-sm shadow-marca-600/25 hover:bg-marca-700 focus-visible:outline-marca-600',
  secundario:
    'bg-white text-slate-700 shadow-xs ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-marca-600',
  perigo: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 focus-visible:outline-red-600',
  fantasma: 'text-slate-600 hover:bg-marca-50 hover:text-marca-700 focus-visible:outline-marca-600',
  // Para fundos escuros (ex.: banner azul do dashboard)
  claro: 'bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/25 focus-visible:outline-white',
};

const TAMANHOS: Record<Tamanho, string> = {
  md: 'gap-2 px-4 py-2.5 text-sm',
  sm: 'gap-1.5 px-3 py-1.5 text-xs',
};

function classesBotao(variante: Variante = 'primario', tamanho: Tamanho = 'md') {
  return `inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`;
}

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
  /** Mostra um indicador de progresso e desabilita o botão */
  carregando?: boolean;
};

export function Botao({
  variante,
  tamanho = 'md',
  icone: Icone,
  carregando = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}: PropsBotao) {
  const tamanhoIcone = tamanho === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={`${classesBotao(variante, tamanho)} ${className}`}
      {...props}
    >
      {carregando ? (
        <span className={`${tamanhoIcone} animate-spin rounded-full border-2 border-current border-r-transparent`} aria-hidden />
      ) : (
        Icone && <Icone className={tamanhoIcone} aria-hidden />
      )}
      {children}
    </button>
  );
}

type PropsBotaoIcone = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icone: LucideIcon;
  /** Texto lido por leitores de tela e exibido ao passar o mouse */
  rotulo: string;
  perigo?: boolean;
};

/** Botão compacto só com ícone, usado nas ações das tabelas. */
export function BotaoIcone({ icone: Icone, rotulo, perigo = false, className = '', ...props }: PropsBotaoIcone) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`rounded-lg p-2 transition-colors focus-visible:outline-2 focus-visible:outline-marca-600 disabled:opacity-50 ${
        perigo ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-marca-50 hover:text-marca-700'
      } ${className}`}
      {...props}
    >
      <Icone className="size-4" aria-hidden />
    </button>
  );
}

type PropsBotaoLink = LinkProps & { variante?: Variante; tamanho?: Tamanho; icone?: LucideIcon };

/** Link com aparência de botão (navega para outra página). */
export function BotaoLink({ variante, tamanho = 'md', icone: Icone, className = '', children, ...props }: PropsBotaoLink) {
  return (
    <Link className={`${classesBotao(variante, tamanho)} ${className}`} {...props}>
      {Icone && <Icone className={tamanho === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />}
      {children}
    </Link>
  );
}
