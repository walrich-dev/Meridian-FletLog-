import { createContext, useContext } from 'react';

export type TipoNotificacao = 'sucesso' | 'erro';
export type Notificar = (tipo: TipoNotificacao, mensagem: string) => void;

export const NotificacoesContext = createContext<Notificar | null>(null);

/** Exibe um aviso rápido no canto da tela, ex.: notificar('sucesso', 'Veículo cadastrado.') */
export function useNotificar(): Notificar {
  const notificar = useContext(NotificacoesContext);
  if (!notificar) throw new Error('useNotificar precisa estar dentro de <NotificacoesProvider>');
  return notificar;
}
