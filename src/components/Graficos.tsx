// Gráficos simples em HTML/CSS para o dashboard (RF02), sem biblioteca externa.
// Convenções: barras finas (até 24px) com ponta arredondada e base reta, uma única
// cor por série (azul da marca), grade em linhas finas e valores sempre
// acessíveis sem o mouse (rótulos visíveis ou tabela).
import { Link } from 'react-router';

/** Arredonda o topo do eixo para um valor "redondo" (1, 2, 2,5 ou 5 × 10^n). */
function escalaRedonda(maximo: number, divisoes = 4) {
  if (maximo <= 0) return { topo: divisoes, passo: 1 };
  const bruto = maximo / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  return { topo: passo * divisoes, passo };
}

type PontoMensal = { rotulo: string; rotuloCompleto: string; valor: number };

/**
 * Colunas por mês (ex.: custo de manutenção nos últimos 12 meses).
 * Cada coluna mostra o valor ao passar o mouse ou focar pelo teclado; a tabela
 * abaixo do gráfico traz todos os valores.
 */
export function GraficoColunas({
  pontos,
  formatarValor,
  formatarEixo,
  titulo,
}: {
  pontos: PontoMensal[];
  formatarValor: (valor: number) => string;
  formatarEixo: (valor: number) => string;
  titulo: string;
}) {
  const { topo, passo } = escalaRedonda(Math.max(...pontos.map((p) => p.valor)));
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo).reverse();
  const ultimo = pontos.at(-1);

  return (
    <figure>
      <div className="flex gap-3">
        {/* Eixo Y */}
        <div className="flex h-48 flex-col justify-between text-right text-[11px] tabular-nums text-slate-500" aria-hidden>
          {marcas.map((marca) => (
            <span key={marca} className="-my-1.5 leading-3">
              {formatarEixo(marca)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Área do gráfico com linhas de grade */}
          <div className="relative h-48">
            {marcas.map((marca) => (
              <div
                key={marca}
                className="absolute inset-x-0 border-t border-slate-200"
                style={{ bottom: `${(marca / topo) * 100}%` }}
                aria-hidden
              />
            ))}
            <ol className="absolute inset-0 flex items-end" aria-label={titulo}>
              {pontos.map((ponto) => {
                const altura = (ponto.valor / topo) * 100;
                return (
                  <li key={ponto.rotuloCompleto} className="flex h-full flex-1 items-end justify-center px-0.5">
                    <div
                      tabIndex={0}
                      aria-label={`${ponto.rotuloCompleto}: ${formatarValor(ponto.valor)}`}
                      className="group relative flex h-full w-full max-w-6 items-end justify-center rounded-t outline-none focus-visible:ring-2 focus-visible:ring-marca-600/40"
                    >
                      {ponto.valor > 0 && (
                        <div
                          className="w-full rounded-t bg-marca-600 transition-colors group-hover:bg-marca-500 group-focus-visible:bg-marca-500"
                          style={{ height: `${Math.max(altura, 1)}%` }}
                        />
                      )}
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-lg group-hover:block group-focus-visible:block"
                      >
                        <p className="text-sm font-semibold text-white">{formatarValor(ponto.valor)}</p>
                        <p className="text-[11px] text-slate-300">{ponto.rotuloCompleto}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Eixo X */}
          <div className="mt-2 flex border-t border-slate-300 pt-1.5" aria-hidden>
            {pontos.map((ponto, indice) => (
              <span
                key={ponto.rotuloCompleto}
                className={`flex-1 text-center text-[11px] ${
                  indice === pontos.length - 1 ? 'font-semibold text-slate-700' : 'text-slate-500'
                } ${
                  // No celular, mês sim, mês não (contando a partir do atual), para os rótulos não se encostarem
                  (pontos.length - 1 - indice) % 2 === 1 ? 'max-sm:invisible' : ''
                }`}
              >
                {ponto.rotulo}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-800">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">{titulo}</caption>
          <tbody className="divide-y divide-slate-100">
            {pontos.map((ponto) => (
              <tr key={ponto.rotuloCompleto}>
                <th scope="row" className="py-1 text-left font-normal capitalize text-slate-600">
                  {ponto.rotuloCompleto}
                </th>
                <td className="py-1 text-right tabular-nums text-slate-900">{formatarValor(ponto.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {ultimo && <figcaption className="sr-only">{`${titulo}. Mês atual: ${formatarValor(ultimo.valor)}.`}</figcaption>}
    </figure>
  );
}

type ItemBarra = { id: number; rotulo: string; detalhe?: string; valor: number; link?: string };

/** Barras horizontais com o valor escrito na ponta (ex.: custo por veículo). */
export function BarrasHorizontais({
  itens,
  formatarValor,
  titulo,
}: {
  itens: ItemBarra[];
  formatarValor: (valor: number) => string;
  titulo: string;
}) {
  const maximo = Math.max(...itens.map((item) => item.valor), 1);

  return (
    <ul className="space-y-3" aria-label={titulo}>
      {itens.map((item) => (
        <li key={item.id} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
          <div className="min-w-0">
            {item.link ? (
              <Link to={item.link} className="text-sm font-medium text-slate-900 hover:text-marca-700 hover:underline">
                {item.rotulo}
              </Link>
            ) : (
              <p className="text-sm font-medium text-slate-900">{item.rotulo}</p>
            )}
            {item.detalhe && <p className="truncate text-xs text-slate-500">{item.detalhe}</p>}
          </div>
          {/* Todas as barras usam a mesma régua: a largura disponível menos o espaço do valor */}
          <div className="flex items-center gap-2">
            <div
              className="h-3 shrink-0 rounded-r bg-marca-600"
              style={{ width: `calc((100% - 7rem) * ${Math.max(item.valor / maximo, 0.005)})` }}
              aria-hidden
            />
            <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">{formatarValor(item.valor)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

type Parte = { rotulo: string; valor: number; cor: string };

/** Uma barra dividida em partes de um total (ex.: preventiva × corretiva), com legenda e valores. */
export function BarraDeProporcao({ partes, formatarValor }: { partes: Parte[]; formatarValor: (valor: number) => string }) {
  const total = partes.reduce((soma, parte) => soma + parte.valor, 0);
  const visiveis = partes.filter((parte) => parte.valor > 0);

  return (
    <div>
      {/* Partes separadas por um espaço de 2px; pontas externas arredondadas */}
      <div className={`flex h-4 gap-0.5 overflow-hidden rounded ${total ? '' : 'bg-slate-100'}`} aria-hidden>
        {visiveis.map((parte) => (
          <div key={parte.rotulo} className={parte.cor} style={{ width: `${(parte.valor / total) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2">
        {partes.map((parte) => (
          <div key={parte.rotulo} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-slate-600">
              <span className={`size-2.5 rounded-sm ${parte.cor}`} aria-hidden />
              {parte.rotulo}
            </dt>
            <dd className="tabular-nums text-slate-900">
              {formatarValor(parte.valor)}
              <span className="ml-2 inline-block w-10 text-right text-slate-500">
                {total ? `${Math.round((parte.valor / total) * 100)}%` : '—'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Minilinha de tendência (ex.: custo dos últimos 12 meses no indicador do dashboard).
 * Os meses anteriores ficam em azul claro e o mês atual é destacado com um ponto.
 */
export function Sparkline({ valores, descricao }: { valores: number[]; descricao: string }) {
  if (valores.length < 2) return null;
  const largura = 120;
  const altura = 36;
  const margem = 4;
  const maximo = Math.max(...valores, 1);
  const pontos = valores.map((valor, i) => ({
    x: margem + (i / (valores.length - 1)) * (largura - margem * 2),
    y: altura - margem - (valor / maximo) * (altura - margem * 2),
  }));
  const linha = pontos.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${margem},${altura - margem} ${linha} ${largura - margem},${altura - margem}`;
  const ultimo = pontos[pontos.length - 1];

  return (
    // A largura acompanha o cartão (@container do Indicador): estreito quando
    // ele está em 4 colunas, inteiro quando há folga.
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="h-9 w-16 overflow-visible @min-[18rem]:w-28"
      role="img"
      aria-label={descricao}
    >
      <polygon points={area} className="fill-marca-500/10" />
      <polyline
        points={linha}
        fill="none"
        className="stroke-marca-300"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={ultimo.x} cy={ultimo.y} r={4} className="fill-marca-600 stroke-white" strokeWidth={2} />
    </svg>
  );
}
