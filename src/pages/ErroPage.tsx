import { AlertTriangle, Home } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { BotaoLink } from '../components/ui/Botao';

/** Exibida quando acontece um erro inesperado ao renderizar uma página. */
export function ErroPage() {
  const erro = useRouteError();
  const detalhe = isRouteErrorResponse(erro)
    ? `${erro.status} ${erro.statusText}`
    : erro instanceof Error
      ? erro.message
      : 'Erro desconhecido';

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50">
          <AlertTriangle className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-slate-500">Ocorreu um erro inesperado ao exibir esta página.</p>
        <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-700">{detalhe}</pre>
        <BotaoLink to="/" icone={Home} className="mt-6">
          Voltar ao início
        </BotaoLink>
      </div>
    </div>
  );
}
