import { UserCog } from 'lucide-react';
import { Botao } from '../../components/ui/Botao';
import { CampoCaixa, CampoSelecao, CampoTexto } from '../../components/ui/Campo';
import { FormularioModal, Modal } from '../../components/ui/Modal';
import { useFormulario } from '../../hooks/useFormulario';
import { api } from '../../lib/api';
import type { UsuarioCadastro } from '../../lib/tipos';

type Props = {
  usuario?: UsuarioCadastro;
  /** O administrador não pode inativar nem rebaixar a si mesmo */
  ehOProprio: boolean;
  aoFechar: () => void;
  aoSalvar: (usuario: UsuarioCadastro) => void;
};

export function UsuarioFormulario({ usuario, ehOProprio, aoFechar, aoSalvar }: Props) {
  const { valores, definir, erros, erroGeral, enviando, enviar } = useFormulario({
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    perfil: usuario?.perfil ?? 'GESTOR',
    ativo: usuario?.ativo ?? true,
    senha: '',
  });

  function salvar() {
    enviar(async () => {
      const { senha, ...dados } = valores;
      const salvo = usuario
        ? await api.put<UsuarioCadastro>(`/usuarios/${usuario.id}`, { ...dados, novaSenha: senha })
        : await api.post<UsuarioCadastro>('/usuarios', { ...dados, senha });
      aoSalvar(salvo);
    });
  }

  return (
    <Modal titulo={usuario ? 'Editar usuário' : 'Novo usuário'} icone={UserCog} aoFechar={aoFechar}>
      <FormularioModal
        aoEnviar={salvar}
        erroGeral={erroGeral}
        rodape={
          <>
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando}>
              {usuario ? 'Salvar alterações' : 'Cadastrar usuário'}
            </Botao>
          </>
        }
      >
        <CampoTexto
          rotulo="Nome"
          obrigatorio
          autoFocus
          maxLength={120}
          value={valores.nome}
          aoAlterar={(valor) => definir('nome', valor)}
          erro={erros.nome}
        />
        <CampoTexto
          rotulo="E-mail (login)"
          obrigatorio
          type="email"
          autoComplete="off"
          value={valores.email}
          aoAlterar={(valor) => definir('email', valor)}
          erro={erros.email}
        />
        <CampoSelecao
          rotulo="Perfil"
          obrigatorio
          disabled={ehOProprio}
          value={valores.perfil}
          aoAlterar={(valor) => definir('perfil', valor as typeof valores.perfil)}
          erro={erros.perfil}
          dica={ehOProprio ? 'Você não pode alterar o próprio perfil.' : 'O administrador também gerencia usuários e configurações.'}
        >
          <option value="GESTOR">Gestor de frota</option>
          <option value="ADMIN">Administrador</option>
        </CampoSelecao>
        <CampoTexto
          rotulo={usuario ? 'Nova senha' : 'Senha'}
          obrigatorio={!usuario}
          type="password"
          autoComplete="new-password"
          value={valores.senha}
          aoAlterar={(valor) => definir('senha', valor)}
          erro={erros.senha ?? erros.novaSenha}
          dica={usuario ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 8 caracteres.'}
        />
        {usuario && !ehOProprio && (
          <CampoCaixa
            rotulo="Usuário ativo"
            dica="Usuários inativos não conseguem entrar no sistema."
            marcado={valores.ativo}
            aoAlterar={(marcado) => definir('ativo', marcado)}
          />
        )}
      </FormularioModal>
    </Modal>
  );
}
