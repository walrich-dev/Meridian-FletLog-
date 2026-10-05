import { useState } from 'react';
import { ApiError } from '../lib/api';

/**
 * Estado de um formulário: valores, erros por campo e envio.
 * Os erros de validação devolvidos pela API (ex.: { placa: ['Placa inválida'] })
 * aparecem embaixo do campo correspondente.
 */
export function useFormulario<T extends Record<string, string | boolean>>(valoresIniciais: T) {
  const [valores, setValores] = useState<T>(valoresIniciais);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function definir<K extends keyof T>(campo: K, valor: T[K]) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    // Ao editar o campo, o erro dele some
    setErros((anteriores) => {
      const { [campo as string]: _removido, ...resto } = anteriores;
      return resto;
    });
  }

  /** Executa o envio tratando os erros da API. Retorna true se deu certo. */
  async function enviar(acao: () => Promise<void>): Promise<boolean> {
    setEnviando(true);
    setErroGeral(null);
    setErros({});
    try {
      await acao();
      return true;
    } catch (erro) {
      if (erro instanceof ApiError) {
        const porCampo = Object.fromEntries(
          Object.entries(erro.detalhes ?? {}).map(([campo, mensagens]) => [campo, mensagens[0]]),
        );
        setErros(porCampo);
        const temErroEmCampo = Object.keys(porCampo).length > 0;
        setErroGeral(temErroEmCampo && erro.message === 'Dados inválidos.' ? 'Verifique os campos destacados.' : erro.message);
      } else {
        setErroGeral('Ocorreu um erro inesperado. Tente novamente.');
      }
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { valores, definir, erros, erroGeral, enviando, enviar };
}
