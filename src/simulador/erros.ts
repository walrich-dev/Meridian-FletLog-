/**
 * Erro "esperado" de regra de negócio (ex.: "Veículo não encontrado."), convertido
 * pelo roteador na resposta { mensagem, detalhes } com o status informado.
 * `detalhes` traz erros por campo, ex.: { placa: ['Já existe um cadastro com esta placa.'] }.
 */
export class ErroApi extends Error {
  readonly status: number;
  readonly detalhes?: Record<string, string[]>;

  constructor(mensagem: string, status = 400, detalhes?: Record<string, string[]>) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes;
  }
}

/** Erro de um único campo do formulário. */
export function erroDeCampo(campo: string, mensagem: string, status = 400): ErroApi {
  return new ErroApi(mensagem, status, { [campo]: [mensagem] });
}
