import { createBrowserRouter } from 'react-router';
import { ApenasPerfis, RotaProtegida } from './auth/RotaProtegida';
import { AppLayout } from './components/layout/AppLayout';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ErroPage } from './pages/ErroPage';
import { LoginPage } from './pages/LoginPage';
import { ManutencoesPage } from './pages/manutencoes/ManutencoesPage';
import { MotoristasPage } from './pages/motoristas/MotoristasPage';
import { NaoEncontradaPage } from './pages/NaoEncontradaPage';
import { UsuariosPage } from './pages/usuarios/UsuariosPage';
import { VeiculoDetalhePage } from './pages/veiculos/VeiculoDetalhePage';
import { VeiculosPage } from './pages/veiculos/VeiculosPage';

// Rotas do painel. O login fica fora do layout; as demais páginas exigem
// autenticação (RNF01) e são exibidas dentro do AppLayout (menu + cabeçalho).
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <ErroPage /> },
  {
    element: <RotaProtegida />,
    errorElement: <ErroPage />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'veiculos', element: <VeiculosPage /> },
          { path: 'veiculos/:id', element: <VeiculoDetalhePage /> },
          { path: 'motoristas', element: <MotoristasPage /> },
          { path: 'manutencoes', element: <ManutencoesPage /> },
          { path: 'configuracoes', element: <ConfiguracoesPage /> },
          {
            element: <ApenasPerfis perfis={['ADMIN']} />,
            children: [{ path: 'usuarios', element: <UsuariosPage /> }],
          },
          { path: '*', element: <NaoEncontradaPage /> },
        ],
      },
    ],
  },
]);
