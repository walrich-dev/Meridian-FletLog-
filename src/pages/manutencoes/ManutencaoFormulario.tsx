import { Wrench } from 'lucide-react';
import { Alternancia } from '../../components/Filtros';
import { Botao } from '../../components/ui/Botao';
import { CampoSelecao, CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useConsulta } from '../../hooks/useConsulta';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import { dataParaInput, formatarKm, formatarPlaca, hojeParaInput } from '../../lib/formatacao';
import { mascaraInteiro } from '../../lib/mascaras';
import type { Manutencao, ResultadoManutencao, VeiculoListagem } from '../../lib/tipos';

type Props = {
  /** Manutenção em edição; ausente = novo cadastro */
  manutencao?: Manutencao;
  /** Veículo já selecionado ao abrir (ex.: na página do veículo) */
  veiculoId?: number;
  aoFechar: () => void;
  aoSalvar: (resultado: ResultadoManutencao) => void;
};

const texto = (valor: number | null | undefined) => (valor === null || valor === undefined ? '' : String(valor));

/**
 * Programação de manutenção (pendente, com alerta por data e/ou km) ou registro
 * de um serviço já realizado (com custo, base do dashboard).
 */
export function ManutencaoFormulario({ manutencao, veiculoId, aoFechar, aoSalvar }: Props) {
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    status: manutencao?.status === 'REALIZADA' ? 'REALIZADA' : 'PENDENTE',
    veiculoId: texto(manutencao?.veiculoId ?? veiculoId),
    tipo: manutencao?.tipo ?? 'PREVENTIVA',
    descricao: manutencao?.descricao ?? '',
    dataProgramada: dataParaInput(manutencao?.dataProgramada),
    kmLimite: texto(manutencao?.kmLimite),
    intervaloKm: texto(manutencao?.intervaloKm),
    intervaloDias: texto(manutencao?.intervaloDias),
    dataRealizacao: manutencao ? dataParaInput(manutencao.dataRealizacao) : hojeParaInput(),
    kmRealizacao: texto(manutencao?.kmRealizacao),
    custo: texto(manutencao?.custo),
    oficina: manutencao?.oficina ?? '',
  });
  const { dados: veiculos } = useConsulta<VeiculoListagem[]>('/veiculos');

  const realizada = valores.status === 'REALIZADA';
  const preventiva = valores.tipo === 'PREVENTIVA';
  const veiculo = veiculos?.find((v) => String(v.id) === valores.veiculoId);
  const kmFaltando = veiculo && valores.kmLimite ? Number(valores.kmLimite) - veiculo.kmAtual : null;

  function salvar() {
    enviar(async () => {
      if (manutencao) {
        const { status: _status, ...dados } = valores; // o status não muda na edição
        const atualizada = await api.put<Manutencao>(`/manutencoes/${manutencao.id}`, dados);
        aoSalvar({ manutencao: atualizada, proxima: null });
      } else {
        aoSalvar(await api.post<ResultadoManutencao>('/manutencoes', valores));
      }
    });
  }

  return (
    <Modal
      titulo={manutencao ? 'Editar manutenção' : 'Nova manutenção'}
      descricao="Preventivas com data ou km geram alertas automaticamente."
      icone={Wrench}
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
              {manutencao ? 'Salvar alterações' : realizada ? 'Registrar serviço' : 'Programar manutenção'}
            </Botao>
          </>
        }
      >
        {!manutencao && (
          <Alternancia
            rotulo="O que deseja fazer"
            valor={valores.status}
            aoAlterar={(valor) => definir('status', valor)}
            opcoes={[
              { valor: 'PENDENTE', rotulo: 'Programar manutenção' },
              { valor: 'REALIZADA', rotulo: 'Registrar serviço já feito' },
            ]}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSelecao
            rotulo="Veículo"
            obrigatorio
            className="sm:col-span-2"
            value={valores.veiculoId}
            aoAlterar={(valor) => definir('veiculoId', valor)}
            erro={erros.veiculoId}
          >
            <option value="">Selecione</option>
            {/* Na edição, o veículo atual aparece mesmo que tenha sido inativado */}
            {manutencao && !veiculos?.some((v) => v.id === manutencao.veiculoId) && (
              <option value={manutencao.veiculoId}>
                {formatarPlaca(manutencao.veiculo.placa)} — {manutencao.veiculo.modelo}
              </option>
            )}
            {veiculos?.map((v) => (
              <option key={v.id} value={v.id}>
                {formatarPlaca(v.placa)} — {v.marca} {v.modelo} ({formatarKm(v.kmAtual)})
              </option>
            ))}
          </CampoSelecao>
          <CampoSelecao
            rotulo="Tipo"
            obrigatorio
            value={valores.tipo}
            aoAlterar={(valor) => definir('tipo', valor as typeof valores.tipo)}
            erro={erros.tipo}
          >
            <option value="PREVENTIVA">Preventiva</option>
            <option value="CORRETIVA">Corretiva</option>
          </CampoSelecao>
        </div>

        <CampoTexto
          rotulo="Serviço"
          obrigatorio
          maxLength={255}
          placeholder={preventiva ? 'Ex.: Troca de óleo e filtros' : 'Ex.: Reparo na suspensão dianteira'}
          value={valores.descricao}
          aoAlterar={(valor) => definir('descricao', valor)}
          erro={erros.descricao}
        />

        {!realizada && (
          <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <legend className="px-1.5 text-sm font-bold text-slate-800">Quando fazer</legend>
            <p className="mb-3 text-xs text-slate-500">
              {preventiva
                ? 'Informe a data, o km limite ou os dois: o alerta considera o que vencer primeiro.'
                : 'Opcional: com data ou km, a corretiva também aparece nos alertas.'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                rotulo="Data programada"
                type="date"
                value={valores.dataProgramada}
                aoAlterar={(valor) => definir('dataProgramada', valor)}
                erro={erros.dataProgramada}
              />
              <CampoTexto
                rotulo="Km limite"
                inputMode="numeric"
                placeholder={veiculo ? String(veiculo.kmAtual + 10_000) : 'Ex.: 60000'}
                value={valores.kmLimite}
                aoAlterar={(valor) => definir('kmLimite', mascaraInteiro(valor))}
                erro={erros.kmLimite}
                dica={
                  kmFaltando !== null &&
                  (kmFaltando > 0 ? `Faltam ${formatarKm(kmFaltando)} para o limite` : 'O veículo já passou deste km')
                }
              />
            </div>
          </fieldset>
        )}

        {preventiva && (
          <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <legend className="px-1.5 text-sm font-bold text-slate-800">Repetir a cada (opcional)</legend>
            <p className="mb-3 text-xs text-slate-500">
              Ao concluir, a próxima preventiva é programada automaticamente com estes intervalos.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                rotulo="Intervalo em km"
                inputMode="numeric"
                placeholder="Ex.: 10000"
                value={valores.intervaloKm}
                aoAlterar={(valor) => definir('intervaloKm', mascaraInteiro(valor))}
                erro={erros.intervaloKm}
              />
              <CampoTexto
                rotulo="Intervalo em dias"
                inputMode="numeric"
                placeholder="Ex.: 180"
                value={valores.intervaloDias}
                aoAlterar={(valor) => definir('intervaloDias', mascaraInteiro(valor).slice(0, 4))}
                erro={erros.intervaloDias}
              />
            </div>
          </fieldset>
        )}

        {realizada && (
          <div className="grid gap-4 sm:grid-cols-3">
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
              placeholder={veiculo ? String(veiculo.kmAtual) : ''}
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
              value={valores.custo}
              aoAlterar={(valor) => definir('custo', valor)}
              erro={erros.custo}
            />
          </div>
        )}

        <CampoTexto
          rotulo="Oficina ou fornecedor"
          maxLength={120}
          value={valores.oficina}
          aoAlterar={(valor) => definir('oficina', valor)}
          erro={erros.oficina}
        />
      </FormularioModal>
    </Modal>
  );
}
