import { X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';

type Props = {
  titulo: string;
  descricao?: ReactNode;
  /** Ícone exibido ao lado do título */
  icone?: LucideIcon;
  aoFechar: () => void;
  children: ReactNode;
  largura?: 'sm' | 'md' | 'lg';
};

const LARGURAS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

/**
 * Janela modal com o elemento nativo <dialog>: o navegador cuida do foco,
 * do fundo escurecido e de fechar com Esc. Abre ao ser exibida; para fechar,
 * o componente pai deixa de exibi-la.
 */
export function Modal({ titulo, descricao, icone: Icone, aoFechar, children, largura = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      className={`m-auto w-[calc(100%-2rem)] ${LARGURAS[largura]} rounded-2xl bg-white p-0 text-slate-900 shadow-2xl shadow-marca-950/20 backdrop:bg-marca-950/50 backdrop:backdrop-blur-[2px]`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
        <div className="flex items-start gap-3">
          {Icone && (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600">
              <Icone className="size-5" aria-hidden />
            </span>
          )}
          <div>
            <h2 id={idTitulo} className="text-lg font-bold tracking-tight">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {children}
    </dialog>
  );
}

type PropsFormulario = {
  aoEnviar: () => void;
  children: ReactNode;
  /** Botões do rodapé (ex.: Cancelar e Salvar) */
  rodape: ReactNode;
  erroGeral?: string | null;
};

/** Corpo de modal com formulário: campos roláveis, mensagem de erro e rodapé fixo. */
export function FormularioModal({ aoEnviar, children, rodape, erroGeral }: PropsFormulario) {
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    aoEnviar();
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="max-h-[calc(100dvh-13rem)] space-y-4 overflow-y-auto border-y border-slate-100 px-6 py-5">
        {erroGeral && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
            {erroGeral}
          </p>
        )}
        {children}
      </div>
      <div className="flex flex-wrap justify-end gap-2 bg-slate-50/80 px-6 py-4">{rodape}</div>
    </form>
  );
}
