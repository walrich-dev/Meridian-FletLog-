import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { Botao } from './Botao';
import { Modal } from './Modal';

type Props = {
  titulo: string;
  mensagem: ReactNode;
  rotuloConfirmar: string;
  /** Ação destrutiva (botão vermelho) */
  perigo?: boolean;
  /** Executada ao confirmar; a janela fecha se der certo e mostra o erro se falhar */
  aoConfirmar: () => Promise<void>;
  aoFechar: () => void;
};

/** Pede confirmação antes de uma ação (ex.: inativar um veículo). */
export function Confirmacao({ titulo, mensagem, rotuloConfirmar, perigo = false, aoConfirmar, aoFechar }: Props) {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setExecutando(true);
    setErro(null);
    try {
      await aoConfirmar();
      aoFechar();
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Ocorreu um erro inesperado.');
      setExecutando(false);
    }
  }

  return (
    <Modal titulo={titulo} icone={perigo ? AlertTriangle : HelpCircle} aoFechar={aoFechar} largura="sm">
      <div className="space-y-3 border-t border-slate-100 px-6 py-5 text-sm text-slate-600">
        <div>{mensagem}</div>
        {erro && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
            {erro}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 bg-slate-50/80 px-6 py-4">
        <Botao variante="secundario" onClick={aoFechar} disabled={executando}>
          Voltar
        </Botao>
        <Botao variante={perigo ? 'perigo' : 'primario'} onClick={confirmar} carregando={executando}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}
