import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { NotificacoesContext, type Notificar, type TipoNotificacao } from './useNotificar';

type Notificacao = { id: number; tipo: TipoNotificacao; mensagem: string };

let proximoId = 1;

/** Avisos rápidos no canto da tela (ex.: "Veículo cadastrado."), que somem sozinhos. */
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const remover = useCallback((id: number) => {
    setNotificacoes((lista) => lista.filter((n) => n.id !== id));
  }, []);

  const notificar = useCallback<Notificar>(
    (tipo, mensagem) => {
      const id = proximoId++;
      setNotificacoes((lista) => [...lista, { id, tipo, mensagem }]);
      setTimeout(() => remover(id), 5000);
    },
    [remover],
  );

  return (
    <NotificacoesContext.Provider value={notificar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {notificacoes.map(({ id, tipo, mensagem }) => {
          const sucesso = tipo === 'sucesso';
          const Icone = sucesso ? CheckCircle2 : XCircle;
          return (
            <div
              key={id}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-xl shadow-marca-950/10 ring-1 ring-slate-900/5"
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full ${
                  sucesso ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                <Icone className="size-5" aria-hidden />
              </span>
              <p className="flex-1 pt-1.5 font-medium">{mensagem}</p>
              <button
                type="button"
                onClick={() => remover(id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar aviso"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </NotificacoesContext.Provider>
  );
}
