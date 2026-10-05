import { Truck } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { CampoSelecao, CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useConsulta } from '../../hooks/useConsulta';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import { formatarPlaca, ROTULO_SITUACAO_CNH } from '../../lib/formatacao';
import { mascaraChassi, mascaraInteiro, mascaraPlaca, mascaraRenavam } from '../../lib/mascaras';
import type { Motorista, Veiculo } from '../../lib/tipos';

// Calculado uma vez, ao carregar o módulo (não durante a renderização)
const ANO_ATUAL = new Date().getFullYear();

type Props = {
  /** Veículo em edição; ausente = novo cadastro */
  veiculo?: Omit<Veiculo, 'motorista'>;
  aoFechar: () => void;
  aoSalvar: (veiculo: Veiculo) => void;
};

/** Cadastro e edição de veículo (RF01). */
export function VeiculoFormulario({ veiculo, aoFechar, aoSalvar }: Props) {
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    placa: veiculo ? formatarPlaca(veiculo.placa) : '',
    marca: veiculo?.marca ?? '',
    modelo: veiculo?.modelo ?? '',
    chassi: veiculo?.chassi ?? '',
    renavam: veiculo?.renavam ?? '',
    anoAquisicao: veiculo ? String(veiculo.anoAquisicao) : '',
    kmAtual: veiculo ? String(veiculo.kmAtual) : '',
    status: veiculo?.status ?? 'ATIVO',
    motoristaId: veiculo?.motoristaId ? String(veiculo.motoristaId) : '',
  });
  const { dados: motoristas } = useConsulta<Motorista[]>('/motoristas');

  function salvar() {
    enviar(async () => {
      const salvo = veiculo
        ? await api.put<Veiculo>(`/veiculos/${veiculo.id}`, valores)
        : await api.post<Veiculo>('/veiculos', valores);
      aoSalvar(salvo);
    });
  }

  return (
    <Modal
      titulo={veiculo ? `Editar veículo ${formatarPlaca(veiculo.placa)}` : 'Novo veículo'}
      descricao="Placa, chassi e RENAVAM não podem se repetir na frota."
      icone={Truck}
      aoFechar={aoFechar}
      largura="lg"
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
              {veiculo ? 'Salvar alterações' : 'Cadastrar veículo'}
            </Botao>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            rotulo="Placa"
            obrigatorio
            autoFocus
            placeholder="ABC1D23"
            dica="Padrão Mercosul ou antigo"
            value={valores.placa}
            aoAlterar={(valor) => definir('placa', mascaraPlaca(valor))}
            erro={erros.placa}
          />
          <CampoTexto
            rotulo="Marca"
            obrigatorio
            maxLength={60}
            placeholder="Ex.: Mercedes-Benz"
            value={valores.marca}
            aoAlterar={(valor) => definir('marca', valor)}
            erro={erros.marca}
          />
          <CampoTexto
            rotulo="Modelo"
            obrigatorio
            maxLength={60}
            placeholder="Ex.: Accelo 1016"
            value={valores.modelo}
            aoAlterar={(valor) => definir('modelo', valor)}
            erro={erros.modelo}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Chassi"
            obrigatorio
            placeholder="17 caracteres"
            value={valores.chassi}
            aoAlterar={(valor) => definir('chassi', mascaraChassi(valor))}
            erro={erros.chassi}
          />
          <CampoTexto
            rotulo="RENAVAM"
            obrigatorio
            inputMode="numeric"
            placeholder="11 dígitos"
            value={valores.renavam}
            aoAlterar={(valor) => definir('renavam', mascaraRenavam(valor))}
            erro={erros.renavam}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            rotulo="Ano de aquisição"
            obrigatorio
            inputMode="numeric"
            placeholder={String(ANO_ATUAL)}
            maxLength={4}
            value={valores.anoAquisicao}
            aoAlterar={(valor) => definir('anoAquisicao', mascaraInteiro(valor).slice(0, 4))}
            erro={erros.anoAquisicao}
          />
          <CampoTexto
            rotulo="Quilometragem atual"
            obrigatorio
            inputMode="numeric"
            placeholder="Ex.: 48500"
            dica="Base dos alertas por km"
            value={valores.kmAtual}
            aoAlterar={(valor) => definir('kmAtual', mascaraInteiro(valor))}
            erro={erros.kmAtual}
          />
          <CampoSelecao
            rotulo="Status"
            obrigatorio
            value={valores.status}
            aoAlterar={(valor) => definir('status', valor as typeof valores.status)}
            erro={erros.status}
          >
            <option value="ATIVO">Ativo</option>
            <option value="EM_MANUTENCAO">Em manutenção</option>
          </CampoSelecao>
        </div>

        <CampoSelecao
          rotulo="Motorista responsável"
          dica="Cada motorista pode ser responsável por um veículo."
          value={valores.motoristaId}
          aoAlterar={(valor) => definir('motoristaId', valor)}
          erro={erros.motoristaId}
        >
          <option value="">Sem motorista</option>
          {motoristas?.map((motorista) => {
            const ocupado = motorista.veiculo !== null && motorista.veiculo.id !== veiculo?.id;
            const observacoes = [
              ocupado && motorista.veiculo && `responsável pelo ${formatarPlaca(motorista.veiculo.placa)}`,
              motorista.situacaoCnh !== 'VALIDA' && ROTULO_SITUACAO_CNH[motorista.situacaoCnh].toLowerCase(),
            ].filter(Boolean);
            return (
              <option key={motorista.id} value={motorista.id} disabled={ocupado}>
                {motorista.nome}
                {observacoes.length > 0 && ` (${observacoes.join(', ')})`}
              </option>
            );
          })}
        </CampoSelecao>
      </FormularioModal>
    </Modal>
  );
}
