import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

/** Aparência comum das caixas de texto e seleções (a largura fica por conta de quem usa). */
export const classesEntrada =
  'block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-marca-500 focus:outline-none focus:ring-4 focus:ring-marca-500/10 disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/10';

type PropsBase = {
  rotulo: string;
  /** Mensagem de erro exibida embaixo do campo */
  erro?: string;
  /** Texto de ajuda exibido embaixo do campo */
  dica?: ReactNode;
  obrigatorio?: boolean;
  className?: string;
};

/** Rótulo, ajuda e erro, ligados ao campo pelos atributos de acessibilidade. */
function EstruturaCampo({
  id,
  rotulo,
  erro,
  dica,
  obrigatorio,
  className = '',
  children,
}: PropsBase & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {rotulo}
        {obrigatorio && (
          <span className="text-red-600" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-xs font-medium text-red-600">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={`${id}-dica`} className="mt-1.5 text-xs text-slate-500">
            {dica}
          </p>
        )
      )}
    </div>
  );
}

function atributosAcessibilidade(id: string, { erro, dica, obrigatorio }: PropsBase) {
  return {
    id,
    required: obrigatorio,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
  };
}

type PropsTexto = PropsBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    /** Aplicada a cada alteração (ex.: máscara de CPF) */
    aoAlterar?: (valor: string) => void;
  };

export function CampoTexto({ rotulo, erro, dica, obrigatorio, className, aoAlterar, onChange, ...props }: PropsTexto) {
  const id = useId();
  return (
    <EstruturaCampo id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      <input
        className={`${classesEntrada} w-full`}
        onChange={(evento) => {
          onChange?.(evento);
          aoAlterar?.(evento.target.value);
        }}
        {...atributosAcessibilidade(id, { rotulo, erro, dica, obrigatorio })}
        {...props}
      />
    </EstruturaCampo>
  );
}

type PropsCaixa = {
  rotulo: string;
  dica?: ReactNode;
  marcado: boolean;
  aoAlterar: (marcado: boolean) => void;
};

export function CampoCaixa({ rotulo, dica, marcado, aoAlterar }: PropsCaixa) {
  const id = useId();
  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(evento) => aoAlterar(evento.target.checked)}
        aria-describedby={dica ? `${id}-dica` : undefined}
        className="mt-0.5 size-4 rounded border-slate-300 accent-marca-600"
      />
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {rotulo}
        </label>
        {dica && (
          <p id={`${id}-dica`} className="text-xs text-slate-500">
            {dica}
          </p>
        )}
      </div>
    </div>
  );
}

type PropsSelecao = PropsBase &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    aoAlterar?: (valor: string) => void;
  };

export function CampoSelecao({
  rotulo,
  erro,
  dica,
  obrigatorio,
  className,
  aoAlterar,
  onChange,
  children,
  ...props
}: PropsSelecao) {
  const id = useId();
  return (
    <EstruturaCampo id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      <select
        className={`${classesEntrada} w-full`}
        onChange={(evento) => {
          onChange?.(evento);
          aoAlterar?.(evento.target.value);
        }}
        {...atributosAcessibilidade(id, { rotulo, erro, dica, obrigatorio })}
        {...props}
      >
        {children}
      </select>
    </EstruturaCampo>
  );
}
