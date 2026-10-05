import { CheckCircle2, Repeat } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { CampoCaixa, CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import { formatarKm, formatarPlaca, hojeParaInput, plural } from '../../lib/formatacao';
import { mascaraInteiro } from '../../lib/mascaras';
import type { Manutencao, ResultadoManutencao } from '../../lib/tipos';

type Props = {
  manutencao: Manutencao;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoManutencao) => void;
};

/** Registra a realização de uma manutenção pendente (data, km, custo e oficina). */
export function ConcluirManutencao({ manutencao, aoFechar, aoConcluir }: Props) {
  const veiculoEmManutencao = manutencao.veiculo.status === 'EM_MANUTENCAO';
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    dataRealizacao: hojeParaInput(),
    kmRealizacao: String(manutencao.veiculo.kmAtual),
    custo: '',
    oficina: manutencao.oficina ?? '',
    liberarVeiculo: veiculoEmManutencao,
  });

  const intervalos = [
    manutencao.intervaloKm && formatarKm(manutencao.intervaloKm),
    manutencao.intervaloDias && plural(manutencao.intervaloDias, 'dia', 'dias'),
  ].filter(Boolean);
  const recorrente = manutencao.tipo === 'PREVENTIVA' && intervalos.length > 0;

  function concluir() {
    enviar(async () => aoConcluir(await api.post<ResultadoManutencao>(`/manutencoes/${manutencao.id}/concluir`, valores)));
  }

  return (
    <Modal
      titulo="Concluir manutenção"
      icone={CheckCircle2}
      descricao={`${manutencao.descricao} · ${formatarPlaca(manutencao.veiculo.placa)}`}
      aoFechar={aoFechar}
    >
      <FormularioModal
        aoEnviar={concluir}
        erroGeral={erroGeral}
        rodape={
          <>
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando}>
              Concluir
            </Botao>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Data de realização"
            obrigatorio
            type="date"
            max={hojeParaInput()}
            value={valores.dataRealizacao}
            aoAlterar={(valor) => definir('dataRealizacao', valor)}
            erro={erros.dataRealizacao}
          />
          <CampoTexto
            rotulo="Km no serviço"
            inputMode="numeric"
            dica="Se for maior, atualiza o km do veículo"
            value={valores.kmRealizacao}
            aoAlterar={(valor) => definir('kmRealizacao', mascaraInteiro(valor))}
            erro={erros.kmRealizacao}
          />
          <CampoTexto
            rotulo="Custo (R$)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0,00"
            autoFocus
            value={valores.custo}
            aoAlterar={(valor) => definir('custo', valor)}
            erro={erros.custo}
          />
          <CampoTexto
            rotulo="Oficina ou fornecedor"
            maxLength={120}
            value={valores.oficina}
            aoAlterar={(valor) => definir('oficina', valor)}
            erro={erros.oficina}
          />
        </div>

        {veiculoEmManutencao && (
          <CampoCaixa
            rotulo="Liberar o veículo"
            dica="O veículo está marcado como “em manutenção” e voltará a ficar ativo."
            marcado={valores.liberarVeiculo}
            aoAlterar={(marcado) => definir('liberarVeiculo', marcado)}
          />
        )}

        {recorrente && (
          <p className="flex gap-2 rounded-xl bg-marca-50 px-3.5 py-3 text-sm font-medium text-marca-800 ring-1 ring-inset ring-marca-600/10">
            <Repeat className="mt-0.5 size-4 shrink-0" aria-hidden />
            Esta preventiva se repete a cada {intervalos.join(' ou ')}. A próxima será programada automaticamente.
          </p>
        )}
      </FormularioModal>
    </Modal>
  );
}
