import { Gauge } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import { formatarKm, formatarPlaca } from '../../lib/formatacao';
import { mascaraInteiro } from '../../lib/mascaras';
import type { Veiculo } from '../../lib/tipos';

type Props = {
  veiculo: Pick<Veiculo, 'id' | 'placa' | 'kmAtual'>;
  aoFechar: () => void;
  aoSalvar: (veiculo: Veiculo) => void;
};

/** Registro rápido do hodômetro: mantém os alertas por quilometragem (RF03) em dia. */
export function AtualizarKm({ veiculo, aoFechar, aoSalvar }: Props) {
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({ kmAtual: '' });

  function salvar() {
    enviar(async () => aoSalvar(await api.patch<Veiculo>(`/veiculos/${veiculo.id}/km`, valores)));
  }

  return (
    <Modal
      titulo="Atualizar quilometragem"
      icone={Gauge}
      descricao={`${formatarPlaca(veiculo.placa)} · atual: ${formatarKm(veiculo.kmAtual)}`}
      aoFechar={aoFechar}
      largura="sm"
    >
      <FormularioModal
        aoEnviar={salvar}
        erroGeral={erroGeral}
        rodape={
          <>
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando}>
              Salvar
            </Botao>
          </>
        }
      >
        <CampoTexto
          rotulo="Nova quilometragem (hodômetro)"
          obrigatorio
          autoFocus
          inputMode="numeric"
          placeholder={String(veiculo.kmAtual)}
          value={valores.kmAtual}
          aoAlterar={(valor) => definir('kmAtual', mascaraInteiro(valor))}
          erro={erros.kmAtual}
          dica={
            valores.kmAtual && Number(valores.kmAtual) > veiculo.kmAtual
              ? `+${formatarKm(Number(valores.kmAtual) - veiculo.kmAtual)} desde a última leitura`
              : 'Digite só os números, sem pontos.'
          }
        />
      </FormularioModal>
    </Modal>
  );
}
