// A marca do Meridian: o "M" dentro do quadrado arredondado, o nome e a legenda.
//
// Duas versões, como no manual da marca:
//   tom="cor"    sobre fundo claro — quadrado com o degradê, nome escuro
//   tom="claro"  sobre o azul do sistema — quadrado translúcido, tudo branco
//
// O ponto laranja é o mesmo nos dois: é ele que dá o acento da marca.
import { useId } from 'react';

type Tom = 'cor' | 'claro';
type Tamanho = 'sm' | 'md' | 'lg';

const TAMANHOS = {
  sm: { caixa: 'size-11', nome: 'text-xl', legenda: 'text-[0.625rem]', espaco: 'gap-3' },
  md: { caixa: 'size-12', nome: 'text-xl', legenda: 'text-[0.6875rem]', espaco: 'gap-3' },
  lg: { caixa: 'size-20', nome: 'text-4xl', legenda: 'text-xs', espaco: 'gap-5' },
} satisfies Record<Tamanho, { caixa: string; nome: string; legenda: string; espaco: string }>;

/** O símbolo sozinho: usado no favicon e sempre que não couber o nome. */
export function MarcaIcone({ tom = 'cor', className = '' }: { tom?: Tom; className?: string }) {
  // useId porque o degradê precisa de um id único: duas marcas na mesma página
  // com o mesmo id fariam a segunda usar o degradê da primeira.
  const idDegrade = useId();

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Meridian">
      {tom === 'cor' ? (
        <>
          <defs>
            <linearGradient id={idDegrade} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5969E8" />
              <stop offset="1" stopColor="#3C3CBE" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="14.5" fill={`url(#${idDegrade})`} />
        </>
      ) : (
        <>
          <rect width="48" height="48" rx="14.5" fill="#fff" fillOpacity="0.16" />
          <rect x="0.7" y="0.7" width="46.6" height="46.6" rx="13.8" fill="none" stroke="#fff" strokeOpacity="0.25" />
        </>
      )}
      <path
        d="M13.4 34V15.8L24 27.2l10.6-11.4v13.6"
        fill="none"
        stroke="#fff"
        strokeWidth="6.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="34.6" cy="33.8" r="4.4" fill="#F2A024" />
    </svg>
  );
}

type Props = {
  tom?: Tom;
  tamanho?: Tamanho;
  /** Mostra "GESTÃO DE FROTA" abaixo do nome */
  legenda?: boolean;
  className?: string;
};

export function Marca({ tom = 'cor', tamanho = 'md', legenda = false, className = '' }: Props) {
  const medidas = TAMANHOS[tamanho];

  return (
    <span className={`flex items-center ${medidas.espaco} ${className}`}>
      <MarcaIcone tom={tom} className={`${medidas.caixa} shrink-0`} />
      <span>
        <span
          className={`block font-bold tracking-tight ${medidas.nome} ${tom === 'cor' ? 'text-slate-900' : 'text-white'}`}
        >
          Meridian
        </span>
        {legenda && (
          <span
            className={`mt-0.5 block font-bold uppercase tracking-[0.2em] ${medidas.legenda} ${
              tom === 'cor' ? 'text-marca-600' : 'text-marca-200/80'
            }`}
          >
            Gestão de frota
          </span>
        )}
      </span>
    </span>
  );
}
