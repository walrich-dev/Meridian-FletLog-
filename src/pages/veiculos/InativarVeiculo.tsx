import { Confirmacao } from '../../components/ui/Confirmacao';
import { api } from '../../lib/api';
import { formatarPlaca } from '../../lib/formatacao';
import type { Veiculo } from '../../lib/tipos';

type Props = {
  veiculo: Pick<Veiculo, 'id' | 'placa'> & { motorista: { nome: string } | null };
  aoFechar: () => void;
  aoInativar: () => void;
};

/** Confirmação da exclusão lógica do veículo. */
export function InativarVeiculo({ veiculo, aoFechar, aoInativar }: Props) {
  return (
    <Confirmacao
      titulo="Inativar veículo"
      perigo
      rotuloConfirmar="Inativar"
      mensagem={
        <>
          <p>
            O veículo <strong>{formatarPlaca(veiculo.placa)}</strong> sairá da frota ativa e deixará de gerar alertas.
            {veiculo.motorista && ` ${veiculo.motorista.nome} ficará sem veículo.`}
          </p>
          <p className="mt-2 text-slate-500">
            O histórico de manutenções e custos é mantido, e o veículo pode ser reativado depois.
          </p>
        </>
      }
      aoConfirmar={async () => {
        await api.delete(`/veiculos/${veiculo.id}`);
        aoInativar();
      }}
      aoFechar={aoFechar}
    />
  );
}
