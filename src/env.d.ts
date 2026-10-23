// Tipagem das variáveis de ambiente do front-end (arquivo .env).
// Só variáveis com prefixo VITE_ chegam ao navegador.
interface ImportMetaEnv {
  /**
   * Endereço da API. Sem ela o painel lança erro já ao carregar, em vez de
   * falhar em cada tela (ver src/lib/api.ts).
   *
   * Exemplos:
   *   http://localhost:3333/api              API rodando na sua máquina
   *   /api                                   a própria API entrega o painel (SERVIR_PAINEL)
   *   https://meridian-api.onrender.com/api  API hospedada à parte
   *
   * Continua opcional no tipo porque o Vite não garante que a variável
   * exista; quem confere em tempo de execução é o src/lib/api.ts.
   */
  readonly VITE_API_URL?: string;
}
