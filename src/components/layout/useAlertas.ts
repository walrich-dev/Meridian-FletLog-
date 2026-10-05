import { createContext, useContext } from 'react';
import type { Alertas } from '../../lib/tipos';

export type ContextoAlertas = {
  alertas: Alertas | undefined;
  erro: string | null;
  /** Chamar depois de alterar veículos, motoristas ou manutenções */
  recarregarAlertas: () => void;
};

export const AlertasContext = createContext<ContextoAlertas | null>(null);

/** Alertas do RF03 compartilhados pelo painel (sino do cabeçalho e dashboard). */
export function useAlertas() {
  const contexto = useContext(AlertasContext);
  if (!contexto) throw new Error('useAlertas precisa estar dentro de <AlertasProvider>');
  return contexto;
}
