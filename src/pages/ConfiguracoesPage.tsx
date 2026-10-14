import { BellRing, DatabaseBackup, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useUsuario } from '../auth/useAuth';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { useAlertas } from '../components/layout/useAlertas';
import { Botao } from '../components/ui/Botao';
import { CampoTexto } from '../components/ui/Campo';
import { Cartao } from '../components/ui/Cartao';
import { Confirmacao } from '../components/ui/Confirmacao';
import { Carregando, MensagemErro } from '../components/ui/Estados';
import { useNotificar } from '../components/ui/useNotificar';
import { useConsulta } from '../hooks/useConsulta';
import { useFormulario } from '../hooks/useFormulario';
import { api } from '../lib/api';
import { mostrarAcessosDeTeste } from '../lib/acessos-demonstracao';
import { formatarData } from '../lib/formatacao';
import { mascaraInteiro } from '../lib/mascaras';
import type { Configuracao } from '../lib/tipos';

export function ConfiguracoesPage() {
  const { dados: configuracao, erro, recarregar } = useConsulta<Configuracao>('/configuracoes');
  const ehAdmin = useUsuario().perfil === 'ADMIN';

  return (
    <>
      <CabecalhoPagina sobretitulo="Administração" titulo="Configurações" descricao="Parâmetros dos alertas e dados de acesso." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {erro && !configuracao ? (
          <MensagemErro mensagem={erro} aoTentarDeNovo={recarregar} />
        ) : !configuracao ? (
          <Carregando />
        ) : (
          // key: recria o formulário com os valores salvos depois de cada alteração
          <AntecedenciaAlertas key={configuracao.atualizadoEm} configuracao={configuracao} aoSalvar={recarregar} />
        )}
        <TrocarSenha />
        {mostrarAcessosDeTeste && ehAdmin && <DadosDemonstracao aoRestaurar={recarregar} />}
      </div>
    </>
  );
}

/** Antecedência dos alertas de manutenção (RF03): só o administrador altera. */
function AntecedenciaAlertas({ configuracao, aoSalvar }: { configuracao: Configuracao; aoSalvar: () => void }) {
  const podeEditar = useUsuario().perfil === 'ADMIN';
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    alertaAntecedenciaKm: String(configuracao.alertaAntecedenciaKm),
    alertaAntecedenciaDias: String(configuracao.alertaAntecedenciaDias),
  });

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const sucesso = await enviar(async () => {
      await api.put('/configuracoes', valores);
    });
    if (sucesso) {
      notificar('sucesso', 'Configuração dos alertas salva.');
      aoSalvar();
      recarregarAlertas();
    }
  }

  return (
    <Cartao
      icone={BellRing}
      titulo="Alertas de manutenção"
      descricao="Com quanta antecedência uma preventiva passa a aparecer como “próxima do limite”."
    >
      <form onSubmit={salvar} noValidate className="space-y-4">
        {erroGeral && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {erroGeral}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Antecedência em km"
            inputMode="numeric"
            disabled={!podeEditar}
            value={valores.alertaAntecedenciaKm}
            aoAlterar={(valor) => definir('alertaAntecedenciaKm', mascaraInteiro(valor))}
            erro={erros.alertaAntecedenciaKm}
            dica="Ex.: 500 = avisar quando faltarem 500 km"
          />
          <CampoTexto
            rotulo="Antecedência em dias"
            inputMode="numeric"
            disabled={!podeEditar}
            value={valores.alertaAntecedenciaDias}
            aoAlterar={(valor) => definir('alertaAntecedenciaDias', mascaraInteiro(valor).slice(0, 3))}
            erro={erros.alertaAntecedenciaDias}
            dica="Vale também para a validade da CNH"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Última alteração: {formatarData(configuracao.atualizadoEm)}</p>
          {podeEditar ? (
            <Botao type="submit" carregando={enviando}>
              Salvar
            </Botao>
          ) : (
            <p className="text-xs text-slate-500">Somente administradores alteram estes valores.</p>
          )}
        </div>
      </form>
    </Cartao>
  );
}

function TrocarSenha() {
  const notificar = useNotificar();
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    senhaAtual: '',
    novaSenha: '',
    confirmacao: '',
  });
  const confirmacaoDiferente = valores.confirmacao !== '' && valores.confirmacao !== valores.novaSenha;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (confirmacaoDiferente) return;
    const sucesso = await enviar(async () => {
      await api.put('/auth/senha', { senhaAtual: valores.senhaAtual, novaSenha: valores.novaSenha });
    });
    if (sucesso) {
      notificar('sucesso', 'Senha alterada.');
      definir('senhaAtual', '');
      definir('novaSenha', '');
      definir('confirmacao', '');
    }
  }

  return (
    <Cartao icone={KeyRound} titulo="Minha senha" descricao="Altere a senha usada para entrar no sistema.">
      <form onSubmit={salvar} noValidate className="space-y-4">
        {erroGeral && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {erroGeral}
          </p>
        )}
        <CampoTexto
          rotulo="Senha atual"
          type="password"
          autoComplete="current-password"
          value={valores.senhaAtual}
          aoAlterar={(valor) => definir('senhaAtual', valor)}
          erro={erros.senhaAtual}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            value={valores.novaSenha}
            aoAlterar={(valor) => definir('novaSenha', valor)}
            erro={erros.novaSenha}
            dica="Mínimo de 8 caracteres"
          />
          <CampoTexto
            rotulo="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            value={valores.confirmacao}
            aoAlterar={(valor) => definir('confirmacao', valor)}
            erro={confirmacaoDiferente ? 'As senhas não conferem.' : undefined}
          />
        </div>
        <div className="flex justify-end">
          <Botao type="submit" carregando={enviando} disabled={!valores.senhaAtual || !valores.novaSenha || confirmacaoDiferente}>
            Alterar senha
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}

/** Desfaz as alterações e recria os dados de exemplo. Aparece só em desenvolvimento. */
function DadosDemonstracao({ aoRestaurar }: { aoRestaurar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const { recarregarAlertas } = useAlertas();
  const notificar = useNotificar();

  return (
    <Cartao
      icone={DatabaseBackup}
      titulo="Dados de demonstração"
      descricao="Recria a frota de exemplo no banco de dados."
    >
      <p className="text-sm text-slate-600">
        Restaurar apaga tudo o que foi cadastrado ou alterado e recria a frota de exemplo, com as datas ajustadas para
        hoje. Útil antes de uma apresentação.
      </p>
      <div className="mt-4 flex justify-end">
        <Botao variante="secundario" icone={DatabaseBackup} onClick={() => setConfirmando(true)}>
          Restaurar dados de demonstração
        </Botao>
      </div>

      {confirmando && (
        <Confirmacao
          titulo="Restaurar dados de demonstração"
          perigo
          rotuloConfirmar="Restaurar"
          mensagem={<p>Todos os cadastros, manutenções e usuários voltarão ao estado inicial. Esta ação não pode ser desfeita.</p>}
          aoConfirmar={async () => {
            await api.post('/demonstracao/restaurar');
            notificar('sucesso', 'Dados de demonstração restaurados.');
            aoRestaurar();
            recarregarAlertas();
          }}
          aoFechar={() => setConfirmando(false)}
        />
      )}
    </Cartao>
  );
}
