// Atalhos de login mostrados apenas em desenvolvimento, para não precisar digitar
// o e-mail e a senha a cada teste. Na versão de produção (npm run build) eles não
// aparecem, porque exibir credenciais na tela de login de um sistema em uso seria
// uma falha de segurança.
//
// São as mesmas pessoas fictícias criadas por "npm run banco:popular" na API.
export const ACESSOS_DEMONSTRACAO = [
  { nome: 'Mariana Costa', email: 'admin@meridian.local', senha: 'Frota@2026', perfil: 'ADMIN' },
  { nome: 'Rafael Alves', email: 'gestor@meridian.local', senha: 'Gestor@2026', perfil: 'GESTOR' },
] as const;

/** true somente com `npm run dev`; false na versão de produção. */
export const mostrarAcessosDeTeste = import.meta.env.DEV;
