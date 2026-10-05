import { ArrowRight, BellRing, Gauge, LogIn, ShieldCheck, Wrench } from 'lucide-react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Avatar } from '../components/Avatar';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/Campo';
import { useFormulario } from '../hooks/useFormulario';
import { modoSimulado } from '../lib/api';
import { ROTULO_PERFIL } from '../lib/formatacao';
import { ACESSOS_DEMONSTRACAO } from '../simulador/acessos-demonstracao';

const DESTAQUES = [
  { Icone: Gauge, titulo: 'Indicadores da frota', texto: 'Quilometragem, custos e manutenções em um só painel' },
  { Icone: BellRing, titulo: 'Alertas preventivos', texto: 'Aviso antes de vencer, por data ou por quilometragem' },
  { Icone: ShieldCheck, titulo: 'Acesso controlado', texto: 'Perfis de administrador e de gestor de frota' },
];

/** Tela de login (RNF01). */
export function LoginPage() {
  const { usuario, entrar, motivoSaida } = useAuth();
  const location = useLocation();
  const formulario = useFormulario({ email: '', senha: '' });
  const { valores, definir, erros, erroGeral, enviando } = formulario;

  // Página que o usuário tentou abrir antes de fazer login
  const destino = (location.state as { de?: string } | null)?.de ?? '/';

  // Já logado (ou login concluído agora): segue para o destino
  if (usuario) return <Navigate to={destino} replace />;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    formulario.enviar(() => entrar(valores.email, valores.senha));
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <PainelDaMarca />

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-marca-600 shadow-lg shadow-marca-600/30">
              <img src="/favicon.svg" alt="" className="size-8" />
            </span>
            <span className="text-xl font-bold tracking-tight">Meridian</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo de volta</h2>
          <p className="mt-2 text-slate-500">Entre com o e-mail e a senha cadastrados pelo administrador.</p>

          <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
            {(erroGeral || motivoSaida) && (
              <p
                role="alert"
                className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1 ring-inset ${
                  erroGeral ? 'bg-red-50 text-red-700 ring-red-600/15' : 'bg-amber-50 text-amber-800 ring-amber-600/20'
                }`}
              >
                {erroGeral ?? motivoSaida}
              </p>
            )}
            <CampoTexto
              rotulo="E-mail"
              type="email"
              autoComplete="username"
              placeholder="voce@empresa.com.br"
              autoFocus
              value={valores.email}
              aoAlterar={(valor) => definir('email', valor)}
              erro={erros.email}
            />
            <CampoTexto
              rotulo="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={valores.senha}
              aoAlterar={(valor) => definir('senha', valor)}
              erro={erros.senha}
            />
            <Botao type="submit" icone={LogIn} carregando={enviando} className="w-full py-3">
              Entrar no painel
            </Botao>
          </form>

          {modoSimulado && (
            <div className="mt-10">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                Acessos de demonstração
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <ul className="mt-4 grid gap-3">
                {ACESSOS_DEMONSTRACAO.map((acesso) => (
                  <li key={acesso.email}>
                    <button
                      type="button"
                      onClick={() => {
                        definir('email', acesso.email);
                        definir('senha', acesso.senha);
                      }}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-marca-300 hover:bg-marca-50/50"
                    >
                      <Avatar nome={acesso.nome} tamanho="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{ROTULO_PERFIL[acesso.perfil]}</span>
                        <span className="block truncate text-xs text-slate-500">{acesso.email}</span>
                      </span>
                      <ArrowRight className="size-4 text-slate-300 transition group-hover:text-marca-600" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-center text-xs text-slate-400">Clique em um perfil para preencher o login.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Lado esquerdo da tela de login, com a identidade do sistema. */
function PainelDaMarca() {
  return (
    <section className="relative hidden overflow-hidden bg-linear-to-br from-marca-600 via-marca-800 to-marca-950 p-12 text-white lg:flex lg:flex-col">
      {/* Decoração: grade e brilhos */}
      <svg className="absolute inset-0 size-full opacity-[0.08]" aria-hidden>
        <defs>
          <pattern id="grade-login" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grade-login)" />
      </svg>
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-marca-400/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />

      <div className="relative flex items-center gap-5">
        <span className="grid size-20 place-items-center rounded-3xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <img src="/favicon.svg" alt="" className="size-14" />
        </span>
        <span className="text-4xl font-bold tracking-tight">Meridian</span>
      </div>

      <div className="relative my-auto py-12">
        <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-marca-100 ring-1 ring-white/20">
          Controle de frota para pequenas empresas
        </p>
        <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
          Sua frota sob controle, do hodômetro à oficina.
        </h1>

        <ul className="mt-10 space-y-5">
          {DESTAQUES.map(({ Icone, titulo, texto }) => (
            <li key={titulo} className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Icone className="size-5 text-marca-100" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{titulo}</span>
                <span className="block text-sm text-marca-100/80">{texto}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Exemplo de alerta, para ilustrar o RF03 */}
        <div className="mt-12 max-w-sm rounded-2xl bg-white/95 p-4 text-slate-900 shadow-2xl shadow-marca-950/40" aria-hidden>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Wrench className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Troca de óleo e filtros</p>
              <p className="text-xs text-slate-500">RTA1B23 · faltam 430 km</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-600/20">
              Próxima
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[92%] rounded-full bg-amber-500" />
          </div>
        </div>
      </div>
    </section>
  );
}
