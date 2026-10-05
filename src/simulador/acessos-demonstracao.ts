// Usuários criados nos dados de demonstração (pessoas fictícias). Ficam em um arquivo
// próprio, sem dependências, para a tela de login exibi-los sem carregar a API simulada.
export const ACESSOS_DEMONSTRACAO = [
  { nome: 'Mariana Costa', email: 'admin@meridian.local', senha: 'Frota@2026', perfil: 'ADMIN' },
  { nome: 'Rafael Alves', email: 'gestor@meridian.local', senha: 'Gestor@2026', perfil: 'GESTOR' },
] as const;
