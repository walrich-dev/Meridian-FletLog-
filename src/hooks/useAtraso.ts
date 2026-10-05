import { useEffect, useState } from 'react';

/**
 * Devolve o valor só depois que ele para de mudar por `ms` milissegundos.
 * Usado na busca: a API é consultada quando o usuário para de digitar, não a cada letra.
 */
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(temporizador);
  }, [valor, ms]);

  return atrasado;
}
