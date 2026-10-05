import { useMemo, type ReactNode } from 'react';
import { useConsulta } from '../../hooks/useConsulta';
import type { Alertas } from '../../lib/tipos';
import { AlertasContext } from './useAlertas';

/**
 * Alertas do RF03 compartilhados pelo painel: o sino do cabeçalho e o dashboard
 * usam a mesma consulta, atualizada sempre que algum cadastro muda.
 */
export function AlertasProvider({ children }: { children: ReactNode }) {
  const { dados, erro, recarregar } = useConsulta<Alertas>('/alertas');
  const valor = useMemo(() => ({ alertas: dados, erro, recarregarAlertas: recarregar }), [dados, erro, recarregar]);
  return <AlertasContext.Provider value={valor}>{children}</AlertasContext.Provider>;
}
