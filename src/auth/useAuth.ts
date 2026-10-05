import { createContext, useContext } from 'react';
import type { Usuario } from '../lib/tipos';

export type ContextoAuth = {
  usuario: Usuario | null;
  /** true enquanto confere, ao abrir o painel, se o login salvo ainda é válido */
  carregando: boolean;
  /** Por que o usuário foi deslogado (ex.: sessão expirada), exibido na tela de login */
  motivoSaida: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: (motivo?: string) => void;
};

export const AuthContext = createContext<ContextoAuth | null>(null);

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return contexto;
}

/** Usuário logado. Use apenas em páginas protegidas por <RotaProtegida>. */
export function useUsuario(): Usuario {
  const { usuario } = useAuth();
  if (!usuario) throw new Error('Nenhum usuário logado');
  return usuario;
}
