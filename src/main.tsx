import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './auth/AuthProvider';
import { NotificacoesProvider } from './components/ui/Notificacoes';
import './index.css';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificacoesProvider>
        <RouterProvider router={router} />
      </NotificacoesProvider>
    </AuthProvider>
  </StrictMode>,
);
