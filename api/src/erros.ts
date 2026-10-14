/**
 * Erro que vira uma resposta HTTP. O campo `detalhes` leva a mensagem para o
 * campo certo do formulário, no formato que o painel espera:
 * { mensagem, detalhes: { placa: ["Já existe um cadastro com esta placa."] } }
 */
export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly detalhes?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ErroApi';
  }
}

/** Erro apontando um campo específico do formulário. */
export function erroDeCampo(campo: string, mensagem: string, status = 400): ErroApi {
  return new ErroApi(mensagem, status, { [campo]: [mensagem] });
}

export const naoEncontrado = (o: string) => new ErroApi(`${o} não encontrado.`, 404);
