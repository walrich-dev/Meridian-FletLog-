import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Resultado<T> = {
  /** Qual requisição produziu este resultado (caminho + nº da recarga) */
  chave: string | null;
  dados: T | undefined;
  erro: string | null;
};

/**
 * Busca dados da API (GET) e refaz a busca quando o caminho muda (ex.: filtros na query string).
 * Durante uma nova busca, os dados anteriores continuam na tela, evitando "piscar".
 * Passe null para não buscar nada.
 */
export function useConsulta<T>(caminho: string | null) {
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T>>({ chave: null, dados: undefined, erro: null });
  const chave = caminho === null ? null : `${versao}:${caminho}`;

  useEffect(() => {
    if (caminho === null || chave === null) return;
    let ativo = true; // ignora respostas que chegam depois de o caminho mudar

    api
      .get<T>(caminho)
      .then((dados) => ativo && setResultado({ chave, dados, erro: null }))
      .catch((erro: Error) => ativo && setResultado((anterior) => ({ chave, dados: anterior.dados, erro: erro.message })));

    return () => {
      ativo = false;
    };
  }, [caminho, chave]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    dados: resultado.dados,
    erro: resultado.erro,
    // Carregando enquanto o último resultado não for o da requisição atual
    carregando: chave !== null && resultado.chave !== chave,
    recarregar,
  };
}
