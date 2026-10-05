// Tipagem das variáveis de ambiente do front-end (arquivo .env).
// Só variáveis com prefixo VITE_ chegam ao navegador.
interface ImportMetaEnv {
  /** URL da API real, ex.: https://meridian-api.onrender.com/api. Vazia = API simulada no navegador */
  readonly VITE_API_URL?: string;
}
