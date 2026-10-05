import { Navigate, Outlet, useLocation } from 'react-router';
import { Carregando } from '../components/ui/Estados';
import type { Perfil } from '../lib/tipos';
import { useAuth } from './useAuth';

/** Só exibe as páginas internas para quem fez login (RNF01); os demais vão para /login. */
export function RotaProtegida() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Carregando texto="Abrindo o Meridian..." />
      </div>
    );
  }
  if (!usuario) {
    // Guarda a página pedida para voltar a ela depois do login
    return <Navigate to="/login" replace state={{ de: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

/** Restringe as páginas filhas a determinados perfis (ex.: gestão de usuários só para ADMIN). */
export function ApenasPerfis({ perfis }: { perfis: Perfil[] }) {
  const { usuario } = useAuth();
  return usuario && perfis.includes(usuario.perfil) ? <Outlet /> : <Navigate to="/" replace />;
}
