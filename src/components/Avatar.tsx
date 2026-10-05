// Tons de azul para os avatares; a mesma pessoa recebe sempre a mesma cor
const CORES = [
  'bg-marca-100 text-marca-700',
  'bg-marca-600 text-white',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-marca-800 text-white',
];

const TAMANHOS = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' };

/** "Ana Paula Souza" -> "AS" */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

function corDoNome(nome: string): string {
  const soma = [...nome].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return CORES[soma % CORES.length];
}

/** Círculo com as iniciais da pessoa. */
export function Avatar({ nome, tamanho = 'md' }: { nome: string; tamanho?: keyof typeof TAMANHOS }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${TAMANHOS[tamanho]} ${corDoNome(nome)}`}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
