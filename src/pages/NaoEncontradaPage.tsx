import { Home, MapPinOff } from 'lucide-react';
import { BotaoLink } from '../components/ui/Botao';

export function NaoEncontradaPage() {
  return (
    <div className="py-20 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-marca-50 text-marca-600 ring-8 ring-marca-50/50">
        <MapPinOff className="size-7" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-wider text-marca-600">Erro 404</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 text-slate-500">Esta rota não existe no Meridian. Que tal voltar para o painel?</p>
      <BotaoLink to="/" icone={Home} className="mt-8">
        Voltar ao dashboard
      </BotaoLink>
    </div>
  );
}
