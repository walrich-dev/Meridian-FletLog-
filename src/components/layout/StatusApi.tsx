import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Health = { status: 'ok'; banco: 'conectado' | 'indisponivel' };
type Estado = 'verificando' | 'online' | 'sem-banco' | 'offline';

const APARENCIA: Record<Estado, { cor: string; texto: string }> = {
  verificando: { cor: 'bg-slate-400', texto: 'Verificando API...' },
  online: { cor: 'bg-emerald-400', texto: 'API online' },
  'sem-banco': { cor: 'bg-amber-400', texto: 'Banco indisponível' },
  offline: { cor: 'bg-red-400', texto: 'API offline' },
};

/** Situação da API e do banco, verificada a cada 30 segundos. */
export function StatusApi() {
  const [estado, setEstado] = useState<Estado>('verificando');

  useEffect(() => {
    let montado = true; // evita atualizar o estado depois que o componente sai da tela

    async function verificar() {
      try {
        const health = await api.get<Health>('/health');
        if (montado) setEstado(health.banco === 'conectado' ? 'online' : 'sem-banco');
      } catch {
        if (montado) setEstado('offline');
      }
    }

    verificar();
    const intervalo = setInterval(verificar, 30_000);
    return () => {
      montado = false;
      clearInterval(intervalo);
    };
  }, []);

  const { cor, texto } = APARENCIA[estado];
  return (
    <p role="status" className="flex items-center gap-2 px-3 text-xs font-medium text-marca-200/80">
      <span className="relative flex size-2">
        <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${cor}`} aria-hidden />
        <span className={`relative size-2 rounded-full ${cor}`} aria-hidden />
      </span>
      {texto}
    </p>
  );
}
