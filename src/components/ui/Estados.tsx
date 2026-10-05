import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Botao } from './Botao';

/** Componentes para os estados de uma tela: carregando, erro e lista vazia. */

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-14 text-sm font-medium text-slate-500">
      <span className="size-5 animate-spin rounded-full border-2 border-marca-600 border-r-transparent" aria-hidden />
      {texto}
    </div>
  );
}

export function MensagemErro({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/15"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        {mensagem}
      </span>
      {aoTentarDeNovo && (
        <Botao variante="secundario" tamanho="sm" onClick={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      )}
    </div>
  );
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
  icone: Icone = Inbox,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  icone?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-marca-50 text-marca-500 ring-8 ring-marca-50/50">
        <Icone className="size-6" aria-hidden />
      </span>
      <p className="mt-5 font-bold text-slate-900">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-slate-500">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
