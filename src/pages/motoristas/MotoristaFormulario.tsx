import { UserRound } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { CampoSelecao, CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import { dataParaInput, formatarCpf } from '../../lib/formatacao';
import { mascaraCnh, mascaraCpf, mascaraTelefone } from '../../lib/mascaras';
import type { CategoriaCnh, Motorista } from '../../lib/tipos';

const CATEGORIAS: CategoriaCnh[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

type Props = {
  /** Motorista em edição; ausente = novo cadastro */
  motorista?: Motorista;
  aoFechar: () => void;
  aoSalvar: (motorista: Motorista) => void;
};

/** Cadastro e edição de motorista (RF01). */
export function MotoristaFormulario({ motorista, aoFechar, aoSalvar }: Props) {
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    nome: motorista?.nome ?? '',
    cpf: motorista ? formatarCpf(motorista.cpf) : '',
    cnh: motorista?.cnh ?? '',
    categoriaCnh: motorista?.categoriaCnh ?? '',
    validadeCnh: dataParaInput(motorista?.validadeCnh),
    telefone: mascaraTelefone(motorista?.telefone ?? ''),
  });

  function salvar() {
    enviar(async () => {
      // A API remove a pontuação e valida os dados (CPF, CNH, telefone)
      const salvo = motorista
        ? await api.put<Motorista>(`/motoristas/${motorista.id}`, valores)
        : await api.post<Motorista>('/motoristas', valores);
      aoSalvar(salvo);
    });
  }

  return (
    <Modal
      titulo={motorista ? 'Editar motorista' : 'Novo motorista'}
      descricao="CPF e CNH podem ser digitados com ou sem pontuação."
      icone={UserRound}
      aoFechar={aoFechar}
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
              {motorista ? 'Salvar alterações' : 'Cadastrar motorista'}
            </Botao>
          </>
        }
      >
        <CampoTexto
          rotulo="Nome completo"
          obrigatorio
          autoFocus
          maxLength={120}
          value={valores.nome}
          aoAlterar={(valor) => definir('nome', valor)}
          erro={erros.nome}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="CPF"
            obrigatorio
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={valores.cpf}
            aoAlterar={(valor) => definir('cpf', mascaraCpf(valor))}
            erro={erros.cpf}
          />
          <CampoTexto
            rotulo="Telefone"
            inputMode="tel"
            placeholder="(61) 99999-9999"
            value={valores.telefone}
            aoAlterar={(valor) => definir('telefone', mascaraTelefone(valor))}
            erro={erros.telefone}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto
            rotulo="Nº de registro da CNH"
            obrigatorio
            inputMode="numeric"
            placeholder="11 dígitos"
            value={valores.cnh}
            aoAlterar={(valor) => definir('cnh', mascaraCnh(valor))}
            erro={erros.cnh}
          />
          <CampoSelecao
            rotulo="Categoria"
            obrigatorio
            value={valores.categoriaCnh}
            aoAlterar={(valor) => definir('categoriaCnh', valor)}
            erro={erros.categoriaCnh}
          >
            <option value="">Selecione</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            rotulo="Validade da CNH"
            obrigatorio
            type="date"
            value={valores.validadeCnh}
            aoAlterar={(valor) => definir('validadeCnh', valor)}
            erro={erros.validadeCnh}
          />
        </div>
      </FormularioModal>
    </Modal>
  );
}
