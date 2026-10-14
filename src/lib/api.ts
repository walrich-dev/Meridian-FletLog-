// Cliente da API: todas as chamadas do painel passam por aqui.
//
// O endereço da API vem de VITE_API_URL (arquivo .env). Sem ele, o painel não
// tem com quem conversar, então o erro é mostrado logo, e não a cada tela.
const URL_API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

if (!URL_API) {
  throw new Error(
    'VITE_API_URL não foi definida. Copie o arquivo .env.example para .env e informe o endereço da API (ex.: http://localhost:3333/api).',
  );
}

/** Erro devolvido pela API, já com a mensagem pronta para exibir ao usuário. */
export class ApiError extends Error {
  readonly status: number;
  /** Erros por campo do formulário, ex.: { placa: ['Placa inválida...'] } */
  readonly detalhes?: Record<string, string[]>;

  constructor(mensagem: string, status: number, detalhes?: Record<string, string[]>) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.detalhes = detalhes;
  }
}

// Token de login (RNF01), enviado no cabeçalho Authorization de cada requisição
let token: string | null = null;
let aoPerderSessao: (() => void) | null = null;

export function definirToken(novoToken: string | null) {
  token = novoToken;
}

/** Função chamada quando a API recusa o token (expirado ou usuário inativado). */
export function definirAoPerderSessao(callback: (() => void) | null) {
  aoPerderSessao = callback;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RespostaBruta = { status: number; corpo: unknown };
type Envio = { metodo: Metodo; caminho: string; dados: unknown; token: string | null };

async function enviarHttp({ metodo, caminho, dados, token }: Envio): Promise<RespostaBruta> {
  let resposta: Response;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: dados === undefined ? undefined : JSON.stringify(dados),
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique se ela está em execução.', 0);
  }
  // A API sempre responde JSON; se não vier (ex.: 204), o corpo é tratado como vazio
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  return { status: resposta.status, corpo };
}

async function requisicao<T>(metodo: Metodo, caminho: string, dados?: unknown): Promise<T> {
  // O token é lido no momento da chamada (ex.: o "Sair" envia o logout e só depois limpa o token)
  const envio: Envio = { metodo, caminho, dados, token };
  const { status, corpo } = await enviarHttp(envio);

  if (status >= 400) {
    const erro = corpo as { mensagem?: string; detalhes?: Record<string, string[]> } | null;
    // 401 com token = sessão expirada; no login, 401 é só senha errada
    if (status === 401 && envio.token && envio.token === token) aoPerderSessao?.();
    throw new ApiError(erro?.mensagem ?? `Erro ${status} ao acessar a API.`, status, erro?.detalhes);
  }
  return (status === 204 ? undefined : corpo) as T;
}

export const api = {
  get: <T>(caminho: string) => requisicao<T>('GET', caminho),
  post: <T>(caminho: string, dados?: unknown) => requisicao<T>('POST', caminho, dados),
  put: <T>(caminho: string, dados: unknown) => requisicao<T>('PUT', caminho, dados),
  patch: <T>(caminho: string, dados: unknown) => requisicao<T>('PATCH', caminho, dados),
  delete: <T = void>(caminho: string) => requisicao<T>('DELETE', caminho),
};

/** Monta a query string ignorando filtros vazios: { busca: 'abc', status: '' } -> "?busca=abc" */
export function comFiltros(caminho: string, filtros: Record<string, string | number | undefined | null>) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(chave, String(valor));
  }
  const query = parametros.toString();
  return query ? `${caminho}?${query}` : caminho;
}
