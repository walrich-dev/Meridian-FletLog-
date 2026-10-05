import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, definirAoPerderSessao, definirToken } from '../lib/api';
import type { RespostaLogin, Usuario } from '../lib/tipos';
import { AuthContext } from './useAuth';

// O token fica no localStorage para o login sobreviver a um recarregamento da página.
const CHAVE_TOKEN = 'meridian:token';

function lerTokenSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null; // navegação privada ou armazenamento bloqueado
  }
}

function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sem armazenamento, o login vale só até recarregar a página
  }
}

/** Guarda o usuário logado (RNF01) e oferece entrar/sair para todo o painel. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => lerTokenSalvo() !== null);
  const [motivoSaida, setMotivoSaida] = useState<string | null>(null);

  /** Sem motivo = o usuário clicou em "Sair": a sessão também é encerrada na API. */
  const sair = useCallback((motivo?: string) => {
    if (!motivo) api.post('/auth/logout').catch(() => undefined);
    salvarToken(null);
    definirToken(null);
    setUsuario(null);
    setMotivoSaida(motivo ?? null);
  }, []);

  // Ao abrir o painel: se há token salvo, confere com a API se ele ainda vale
  useEffect(() => {
    definirAoPerderSessao(() => sair('Sua sessão expirou. Entre novamente.'));

    const token = lerTokenSalvo();
    if (token) {
      definirToken(token);
      api
        .get<Usuario>('/auth/me')
        .then(setUsuario)
        .catch(() => {
          salvarToken(null);
          definirToken(null);
        })
        .finally(() => setCarregando(false));
    }

    return () => definirAoPerderSessao(null);
  }, [sair]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api.post<RespostaLogin>('/auth/login', { email, senha });
    salvarToken(resposta.token);
    definirToken(resposta.token);
    setMotivoSaida(null);
    setUsuario(resposta.usuario);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, motivoSaida, entrar, sair }),
    [usuario, carregando, motivoSaida, entrar, sair],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
