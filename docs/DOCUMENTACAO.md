# Meridian: documentação do projeto

Sistema web de controle de frota para pequenas empresas de logística e transporte.
Trabalho de Curso, Bacharelado em Sistemas de Informação, IESGO, 2026.

> Versão em Word, no formato ABNT: [Meridian-Documentacao.docx](Meridian-Documentacao.docx)

## Sumário

1. [Introdução](#1-introdução)
2. [Requisitos](#2-requisitos)
3. [Tecnologias](#3-tecnologias)
4. [Arquitetura](#4-arquitetura)
5. [Banco de dados](#5-banco-de-dados)
6. [Regras de negócio](#6-regras-de-negócio)
7. [A API](#7-a-api)
8. [Interface do sistema](#8-interface-do-sistema)
9. [Testes e qualidade](#9-testes-e-qualidade)
10. [Como executar](#10-como-executar)
11. [Limitações e próximas etapas](#11-limitações-e-próximas-etapas)
12. [Referências](#referências)

---

## 1. Introdução

### 1.1 Contexto e problema

Pequenas empresas de logística e transporte costumam controlar a frota com planilhas, cadernos e lembretes informais. Com esse controle disperso, fica difícil saber a quilometragem atual de cada veículo e quanto foi gasto em manutenção. Fica mais difícil ainda saber quando vence a próxima manutenção preventiva. Uma revisão esquecida aumenta o risco de quebra na estrada, o custo com manutenção corretiva e o tempo em que o veículo fica parado.

O **Meridian** centraliza essas informações em um único sistema web, acessível pelo computador ou pelo celular. Ele avisa o gestor antes que uma manutenção vença, seja pela data, seja pela quilometragem.

### 1.2 Objetivos

**Objetivo geral:** desenvolver um sistema web de controle de frota que centralize o cadastro de veículos e motoristas, registre as manutenções e alerte sobre as manutenções preventivas próximas do vencimento, por quilometragem ou por data.

**Objetivos específicos:**

- implementar a autenticação de usuários com dois perfis de acesso (Administrador e Gestor de frota);
- permitir cadastrar, consultar, editar e inativar veículos e motoristas, validando os documentos brasileiros (placa, chassi, RENAVAM, CPF e CNH);
- apresentar um painel com indicadores de quilometragem, custos e manutenções;
- gerar alertas de manutenção preventiva por quilometragem ou por data, programando automaticamente as manutenções recorrentes;
- armazenar os dados em um banco relacional, com as regras de integridade garantidas pelo próprio banco.

### 1.3 O que o sistema tem hoje

O Meridian está completo nas três camadas:

| Camada | O que é | Onde fica |
| --- | --- | --- |
| **Painel web** | As telas que o usuário usa, em React | `src/` |
| **API REST** | O servidor com as regras de negócio, em Node.js e Express | `api/` |
| **Banco de dados** | PostgreSQL, com 6 tabelas | `api/sql/schema.sql` |

O painel **não acessa o banco diretamente**: ele conversa com a API por HTTP, e só a API fala com o PostgreSQL. Essa separação é o que permite, mais adiante, trocar as telas ou publicar a API em um servidor sem reescrever o resto.

### 1.4 Como o projeto foi construído

O desenvolvimento foi feito em duas etapas:

1. **Painel e regras de negócio**, validados com uma API simulada que rodava no próprio navegador. Isso permitiu acertar as telas e as regras antes de montar servidor e banco.
2. **API e banco de dados reais**, implementados seguindo o contrato de rotas e o modelo de dados que a etapa anterior já havia definido e testado.

As regras de negócio (cálculo da situação da manutenção, recorrência, validação de documentos) foram **aproveitadas sem reescrita** na passagem de uma etapa para a outra, por terem sido escritas como funções puras e em TypeScript nas duas pontas. A API simulada foi removida ao fim da segunda etapa.

## 2. Requisitos

### 2.1 Requisitos atendidos

| Código | Requisito | Como foi atendido |
| --- | --- | --- |
| RNF01 | Autenticação de usuários | Login com e-mail e senha; todas as telas protegidas; perfis Administrador e Gestor; gestão de usuários; troca de senha; sessão de 8 horas; senhas guardadas com bcrypt |
| RF01 | Cadastro, consulta, edição e exclusão de veículos e motoristas | Listagens com busca e filtros; validação de placa, chassi, RENAVAM, CPF e CNH; bloqueio de cadastros duplicados; vínculo entre motorista e veículo; exclusão lógica com reativação |
| RF02 | Dashboard com indicadores de quilometragem, custos e manutenções | Indicadores da frota; custo mensal dos últimos 12 meses; custos de preventiva × corretiva; custo e quilometragem por veículo |
| RF03 | Alertas de manutenção preventiva por km ou por data | Situação calculada (em dia, próxima do limite, vencida); antecedência configurável; próxima preventiva programada automaticamente ao concluir; alertas de CNH vencida ou vencendo |

### 2.2 Outras características de qualidade

- **Responsividade:** o sistema funciona no computador e no celular. No celular, o menu vira uma gaveta e as listagens viram cartões.
- **Padrões brasileiros:** datas, moeda, placas no padrão antigo e no Mercosul. A data de referência é calculada no fuso de Brasília.
- **Erros por campo:** as mensagens de erro apontam exatamente qual campo do formulário corrigir.
- **Integridade:** cada operação é aplicada por inteiro ou não é aplicada, usando transações do banco de dados.

### 2.3 Perfis de acesso

| Funcionalidade | Administrador | Gestor de frota |
| --- | :---: | :---: |
| Dashboard e alertas | ✔ | ✔ |
| Veículos, motoristas e manutenções | ✔ | ✔ |
| Trocar a própria senha | ✔ | ✔ |
| Gerenciar usuários | ✔ | — |
| Alterar a antecedência dos alertas | ✔ | — |

## 3. Tecnologias

**Painel web**

| Tecnologia | Versão | Uso no projeto |
| --- | --- | --- |
| React | 19.3 | Construção da interface em componentes |
| TypeScript | 6.0 | Tipagem estática de todo o código |
| Vite | 8.3 | Servidor de desenvolvimento e geração da versão de produção |
| React Router | 8.4 | Navegação entre telas e rotas protegidas |
| Tailwind CSS | 4.3 | Estilização e identidade visual (paleta azul) |
| lucide-react | 1.50 | Ícones |

**API e banco de dados**

| Tecnologia | Versão | Uso no projeto |
| --- | --- | --- |
| Node.js | 24 | Ambiente de execução do servidor (mínimo 22.12) |
| Express | 5.1 | Recebe as requisições HTTP e as encaminha às rotas |
| PostgreSQL | 18 | Banco de dados relacional (mínimo 16) |
| node-postgres (`pg`) | 8.16 | Conexão com o banco, com SQL escrito à mão |
| bcrypt | 3.0 | Guarda as senhas em formato irreversível |
| Zod | 4.6 | Validação dos dados recebidos pela API |
| Vitest | 5.0 | Testes automatizados |

O TypeScript é usado nas duas pontas. Foi isso que permitiu aproveitar as regras de negócio do painel no servidor sem reescrevê-las.

## 4. Arquitetura

### 4.1 Visão geral

O sistema é dividido em três camadas, cada uma com uma responsabilidade:

![Arquitetura do Meridian](imagens/arquitetura.png)

Lendo de cima para baixo: o usuário interage com as telas; as telas pedem dados ao cliente da API; o cliente envia uma requisição HTTP; o servidor confere quem está pedindo e encaminha para a rota certa; a rota aplica as regras de negócio e consulta o banco.

### 4.2 Organização do código

**Painel (`src/`)**

| Pasta | Responsabilidade |
| --- | --- |
| `pages` | Telas do sistema, uma pasta por funcionalidade |
| `components` | Componentes reutilizáveis: genéricos (botões, campos, janelas, tabelas) e específicos do sistema (placa, gráficos, menu) |
| `auth` | Login, sessão e proteção das rotas por perfil |
| `hooks` | Lógica de tela reaproveitável: consultas à API e controle dos formulários |
| `lib` | Cliente da API, tipos dos dados, formatação e máscaras dos campos |

**API (`api/`)**

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `sql/schema.sql` | Tabelas, tipos, chaves e regras de integridade do banco |
| `src/app.ts` | Monta o servidor: rotas, CORS e tratamento de erros |
| `src/banco.ts` | Conexão com o PostgreSQL, consultas e transações |
| `src/autenticacao.ts` | Confere o token e o perfil de cada requisição |
| `src/rotas` | Uma parte por assunto: veículos, motoristas, manutenções, alertas, dashboard, usuários, configurações |
| `src/regras` | Regras puras: situação, recorrência, validações, datas e senhas |
| `src/scripts` | Criação do banco e dados de demonstração |
| `src/testes` | Testes da API contra um PostgreSQL de verdade |

### 4.3 Fluxo de uma requisição

Exemplo: o usuário conclui uma manutenção.

1. O usuário clica em **Concluir** e informa a data, a quilometragem e o custo do serviço.
2. A tela envia `POST /api/manutencoes/11/concluir` pelo cliente da API, junto com o token da sessão.
3. O servidor confere o token na tabela `sessoes` e verifica se o usuário continua ativo.
4. A rota de manutenções abre uma **transação** no banco e, dentro dela:
   - valida os dados recebidos;
   - marca a manutenção como realizada;
   - atualiza o hodômetro do veículo, se a quilometragem do serviço for maior;
   - se a manutenção for recorrente, cria a próxima a partir da data e do km do serviço.
5. A transação é confirmada. Se qualquer etapa falhar, nada é gravado.
6. A tela recebe a manutenção concluída e a próxima programada, e atualiza a lista e os alertas.

### 4.4 Por que transações

Concluir uma manutenção altera três coisas: a própria manutenção, o hodômetro do veículo e a criação da próxima preventiva. Se o sistema gravasse uma e falhasse na outra, a frota ficaria com dados inconsistentes — por exemplo, uma manutenção marcada como feita sem a próxima programada, fazendo o veículo deixar de ser alertado.

A transação resolve isso: o banco só confirma as alterações se **todas** derem certo. Caso contrário, desfaz tudo (`ROLLBACK`).

## 5. Banco de dados

O modelo abaixo é o que está implementado em `api/sql/schema.sql`. Os tipos são os do PostgreSQL.

![Modelo lógico do banco de dados](modelagem-banco-de-dados.png)

### 5.1 Tabelas

| Tabela | Finalidade | Principais campos |
| --- | --- | --- |
| `usuarios` | Pessoas com acesso ao sistema | nome, e-mail (único), hash da senha, perfil, ativo |
| `sessoes` | Sessões de login abertas | token, usuário, data de expiração |
| `motoristas` | Motoristas da frota | nome, CPF e CNH (únicos), categoria e validade da CNH, telefone, ativo |
| `veiculos` | Veículos da frota | placa, chassi e RENAVAM (únicos), marca, modelo, ano, km atual, status, motorista responsável |
| `manutencoes` | Manutenções programadas e realizadas | veículo, tipo, status, data programada, km limite, intervalos de recorrência; data, km e custo do serviço realizado |
| `configuracoes` | Antecedência dos alertas (tabela de linha única) | antecedência em km (padrão 500) e em dias (padrão 15) |

### 5.2 Relacionamentos

- **motoristas — veiculos (0..1 : 0..1):** cada veículo tem no máximo um motorista responsável, e cada motorista responde por no máximo um veículo. Garantido por uma restrição `UNIQUE` na coluna `motorista_id` da tabela `veiculos`.
- **veiculos — manutencoes (1 : 0..N):** cada manutenção pertence a um único veículo, e cada veículo pode ter várias manutenções.
- **usuarios — sessoes (1 : 0..N):** cada usuário pode ter várias sessões abertas. Ao apagar um usuário, suas sessões são apagadas junto (`ON DELETE CASCADE`).

### 5.3 Regras garantidas pelo banco

Além da validação feita pela API, o próprio banco recusa dados inválidos. Isso protege os dados mesmo que algum programa acesse o banco por fora do sistema.

| Tipo | Exemplos |
| --- | --- |
| **Tipos enumerados** | `perfil_usuario`, `status_veiculo`, `categoria_cnh`, `tipo_manutencao`, `status_manutencao` — a coluna só aceita os valores previstos |
| **Valores únicos** | Placa, chassi e RENAVAM do veículo; CPF e CNH do motorista; e-mail do usuário |
| **Verificações (CHECK)** | Formato da placa (padrão antigo e Mercosul); chassi com 17 caracteres sem as letras I, O e Q; CPF e CNH só com dígitos; preventiva pendente precisa de data ou km; manutenção realizada precisa da data de realização; quilometragem e custo não negativos |
| **Chaves estrangeiras** | Uma manutenção só existe para um veículo existente |

### 5.4 O que não é gravado

A **situação** de uma manutenção (vencida, próxima do limite ou em dia) não tem coluna no banco. Ela muda sozinha com o passar dos dias e com a quilometragem do veículo, então é calculada a cada consulta, comparando a data programada e o km limite com a data de hoje, o hodômetro atual e a antecedência configurada.

Gravar esse valor exigiria recalcular todas as manutenções todos os dias, e qualquer falha nesse processo deixaria alertas errados na tela.

## 6. Regras de negócio

| Código | Regra |
| --- | --- |
| RN01 | Uma manutenção pendente está **vencida** quando passou da data programada ou quando o veículo atingiu o km limite. Está **próxima do limite** quando faltam até N dias ou N km. Se tiver data e km, vale o que vencer primeiro. |
| RN02 | A antecedência dos alertas é configurável (padrão de 15 dias e 500 km). Só o Administrador pode alterá-la. |
| RN03 | Ao concluir uma preventiva com intervalo (ex.: a cada 10.000 km ou 180 dias), a próxima é programada a partir da data e do km em que o serviço foi feito. |
| RN04 | Uma preventiva pendente precisa de data programada, de km limite ou dos dois. Uma manutenção realizada precisa da data de realização, que não pode estar no futuro. |
| RN05 | O hodômetro só avança: a quilometragem informada não pode ser menor que a atual. |
| RN06 | Veículos e motoristas não são apagados, são inativados (exclusão lógica). Ao inativar, o vínculo entre motorista e veículo é desfeito, mas o histórico de custos é mantido. Os dois podem ser reativados depois. |
| RN07 | Manutenções realizadas não podem ser excluídas, só corrigidas. Manutenções canceladas não podem ser editadas. |
| RN08 | Placa, chassi, RENAVAM, CPF, CNH e e-mail não podem se repetir. O CPF tem os dígitos verificadores conferidos. A placa aceita o padrão antigo e o Mercosul. O chassi tem 17 caracteres e não pode ter as letras I, O e Q. |
| RN09 | A CNH é classificada como vencida, vencendo (dentro da antecedência em dias) ou válida. |
| RN10 | Um usuário inativado perde o acesso imediatamente: as sessões abertas dele são apagadas. As senhas são guardadas com bcrypt. |
| RN11 | A data de referência ("hoje") é calculada no fuso de Brasília, seja qual for o fuso do servidor. |

## 7. A API

### 7.1 Como funciona a comunicação

- **Formato:** todas as requisições e respostas usam JSON.
- **Endereço base:** `/api` (em desenvolvimento, `http://localhost:3333/api`).
- **Autenticação:** todas as rotas exigem o cabeçalho `Authorization: Bearer <token>`, exceto `GET /health` e `POST /auth/login`. O token é obtido no login e vale 8 horas.
- **CORS:** o navegador só deixa o painel chamar a API se ela autorizar o endereço de onde a página veio. Os endereços autorizados ficam na variável `ORIGEM_PERMITIDA`.
- **Erros:** seguem o formato abaixo. O campo `detalhes` diz qual campo do formulário destacar.

  ```json
  { "mensagem": "Já existe um cadastro com esta placa.", "detalhes": { "placa": ["Já existe um cadastro com esta placa."] } }
  ```

| Código HTTP | Significado |
| --- | --- |
| 200 | Sucesso |
| 201 | Registro criado |
| 204 | Sucesso, sem conteúdo na resposta |
| 400 | Dados inválidos |
| 401 | Usuário não autenticado |
| 403 | Usuário sem permissão |
| 404 | Não encontrado |
| 409 | Registro duplicado |

### 7.2 Rotas

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| GET | `/health` | Situação da API e do banco | Público |
| POST | `/auth/login` | Recebe `{ email, senha }` e devolve `{ token, usuario }` | Público |
| POST | `/auth/logout` | Sair | Logado |
| GET | `/auth/me` | Dados do usuário logado | Logado |
| PUT | `/auth/senha` | Trocar a própria senha | Logado |
| GET · POST | `/usuarios` | Listar e cadastrar usuários | Administrador |
| PUT | `/usuarios/:id` | Editar ou desativar usuário | Administrador |
| GET · POST | `/veiculos` | Listar (com filtros `busca`, `status`) e cadastrar | Logado |
| GET · PUT · DELETE | `/veiculos/:id` | Consultar, editar e inativar | Logado |
| PATCH | `/veiculos/:id/km` | Atualizar o hodômetro | Logado |
| POST | `/veiculos/:id/reativar` | Reativar | Logado |
| GET · POST | `/motoristas` | Listar e cadastrar | Logado |
| GET · PUT · DELETE | `/motoristas/:id` | Consultar, editar e inativar | Logado |
| POST | `/motoristas/:id/reativar` | Reativar | Logado |
| GET · POST | `/manutencoes` | Listar (filtros `veiculoId`, `status`, `tipo`, `situacao`, `busca`) e cadastrar | Logado |
| GET · PUT · DELETE | `/manutencoes/:id` | Consultar, editar e excluir manutenção pendente | Logado |
| POST | `/manutencoes/:id/concluir` | Concluir e programar a próxima preventiva | Logado |
| POST | `/manutencoes/:id/cancelar` | Cancelar | Logado |
| GET | `/alertas` | Alertas de manutenção e de CNH (RF03) | Logado |
| GET | `/dashboard` | Indicadores (RF02) | Logado |
| GET · PUT | `/configuracoes` | Consultar e alterar a antecedência dos alertas | Logado (só o Administrador altera) |
| POST | `/demonstracao/restaurar` | Recria os dados de exemplo | Administrador |

### 7.3 Decisões de implementação

- **SQL escrito à mão**, em vez de um ORM. As consultas ficam visíveis no código e os recursos do PostgreSQL são usados diretamente. O dashboard, por exemplo, soma os custos com `SUM`, `COUNT FILTER` e `GROUP BY`, deixando o trabalho pesado com o banco.
- **Nomes das colunas:** o banco usa `snake_case` (`km_atual`), que é o padrão do PostgreSQL, e o painel recebe `camelCase` (`kmAtual`), que é o padrão do JavaScript. A conversão é feita no próprio `SELECT`, com `AS "kmAtual"`.
- **Sessões em tabela**, com token aleatório de 64 caracteres. Isso permite encerrar a sessão de alguém na hora, o que um token autossuficiente (como o JWT) não permitiria sem controle extra.
- **Restauração dos dados de demonstração** protegida por uma variável de ambiente, desligada por padrão: em um sistema em uso ela apagaria tudo.

## 8. Interface do sistema

A cor da marca é o azul. Verde, amarelo e vermelho ficam reservados para status (em dia, atenção e vencido) e sempre vêm acompanhados de texto, para que a informação não dependa só da cor. A fonte Plus Jakarta Sans vem junto com o projeto, então funciona sem internet.

### Login
O usuário entra com e-mail e senha. Durante o desenvolvimento, a tela mostra atalhos para os acessos de teste; na versão de produção, eles não aparecem.

![Tela de login](imagens/01-login.png)

### Dashboard (RF02)
Começa com uma saudação e os alertas do dia. Depois vêm os indicadores (veículos, quilometragem média, custo do mês e manutenções pendentes), a lista de alertas e a validade das CNHs.

![Dashboard](imagens/02-dashboard.png)

### Veículos (RF01)
Lista os veículos com busca e filtro por status. Os cartões de resumo no topo também funcionam como filtros.

![Listagem de veículos](imagens/03-veiculos.png)

### Detalhe do veículo
Mostra os dados do veículo, o motorista responsável, os custos e o histórico de manutenções. Daqui é possível atualizar o km, editar e inativar o veículo.

![Detalhe de um veículo](imagens/04-veiculo-detalhe.png)

### Motoristas (RF01)
Lista os motoristas com a situação da CNH e o veículo de cada um.

![Listagem de motoristas](imagens/05-motoristas.png)

### Manutenções (RF03)
Mostra a situação calculada de cada manutenção. Os cartões do topo filtram as vencidas, as próximas do limite e as pendentes.

![Listagem de manutenções](imagens/06-manutencoes.png)

### Cadastro de manutenção
Permite programar uma manutenção por data, por km ou pelos dois, definir de quanto em quanto tempo ela se repete, ou registrar um serviço que já foi feito.

![Formulário de nova manutenção](imagens/07-nova-manutencao.png)

### Usuários (somente o Administrador)

![Gestão de usuários](imagens/08-usuarios.png)

### Configurações
Antecedência dos alertas e troca de senha.

![Configurações](imagens/09-configuracoes.png)

### Celular

<p>
  <img src="imagens/10-celular-dashboard.png" alt="Dashboard no celular" width="280" />
  &nbsp;&nbsp;
  <img src="imagens/11-celular-menu.png" alt="Menu no celular" width="280" />
</p>

## 9. Testes e qualidade

### 9.1 Testes automatizados

A API tem **64 testes automatizados**, que rodam com `npm test` na pasta `api`. Eles são executados contra um **banco PostgreSQL de verdade**, não contra um banco falso: antes de cada teste, as tabelas são recriadas e preenchidas com os dados de demonstração, em um banco separado (`meridian_teste`).

Essa escolha é importante porque boa parte das regras do sistema é garantida pelo próprio banco. Um teste com banco falso não perceberia, por exemplo, se uma restrição `UNIQUE` ou um `CHECK` estivesse faltando.

| Grupo | O que verifica | Testes |
| --- | --- | :---: |
| Autenticação (RNF01) | Login, senha errada, rotas protegidas, logout, acesso restrito ao Administrador, usuário inativado, troca de senha, senha guardada como hash | 9 |
| Veículos (RF01) | Padronização dos documentos, cadastros duplicados, motorista em dois veículos, transação desfeita em caso de erro, hodômetro, inativação | 6 |
| Motoristas (RF01) | Validação e duplicidade de CPF, documentos com pontuação, desvínculo ao inativar, situação da CNH | 4 |
| Manutenções e alertas (RF03) | Geração dos alertas, data ou km obrigatório, recorrência, dupla conclusão, histórico, data futura, antecedência, cancelamento | 8 |
| Dashboard (RF02) | Resumo da frota, quilometragem, custos, histórico preservado após inativar veículo | 2 |
| Filtros e busca | Busca por placa, marca e motorista ignorando acentos; filtros de manutenção | 2 |
| Restauração da demonstração | Recria a frota sem deslogar quem restaurou; restrição ao Administrador | 2 |
| Respostas da API | Situação da API, CORS, rota inexistente, registro inexistente, identificador inválido | 5 |
| Situação e recorrência | Em dia, próxima, vencida por data e por km, critério que vence primeiro, próxima programação, CNH | 11 |
| Validações | Fuso de Brasília, CPF, placa, chassi, RENAVAM, CNH, telefone, valores, datas, busca, senhas com bcrypt | 15 |
| **Total** | | **64** |

### 9.2 Verificações complementares

- **Tipagem:** `npm run typecheck` verifica os tipos de todo o código, no painel e na API.
- **Análise estática:** `npm run lint` roda o oxlint no painel.
- **Testes manuais no navegador:** login, cadastros, conclusão de manutenção com recorrência, restauração dos dados, acesso com o perfil Gestor e uso em tela de celular.

## 10. Como executar

**Pré-requisitos:** [Node.js](https://nodejs.org) 22.12 ou superior e [PostgreSQL](https://www.postgresql.org/download/) 16 ou superior.

**1. Criar o banco de dados**

```bash
psql -U postgres -c "CREATE DATABASE meridian"
```

**2. Subir a API** (em um terminal)

```bash
cd api
npm install
cp .env.example .env     # preencha a senha do PostgreSQL em PGPASSWORD
npm run banco:recriar    # cria as tabelas e grava os dados de demonstração
npm run dev              # a API fica em http://localhost:3333/api
```

**3. Subir o painel** (em outro terminal, na pasta do projeto)

```bash
npm install
cp .env.example .env     # já vem apontando para a API local
npm run dev
```

Abra <http://localhost:5173>.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@meridian.local` | `Frota@2026` |
| Gestor de frota | `gestor@meridian.local` | `Gestor@2026` |

### 10.1 Dados de demonstração

O comando `npm run banco:popular` cria 6 veículos (um deles inativo), 5 motoristas e 24 manutenções, com um ano de histórico de custos. As datas são calculadas a partir do dia da execução, para que sempre existam situações de alerta: preventiva vencida por data e por km, preventivas próximas do limite, CNH vencida e CNH vencendo.

Para recomeçar, entre como Administrador e use **Configurações → Restaurar dados de demonstração**, ou rode `npm run banco:popular` de novo.

## 11. Limitações e próximas etapas

### 11.1 Limitações

- O sistema roda na máquina do desenvolvedor. Ainda não foi publicado em um servidor acessível pela internet.
- Não há cópia de segurança automática do banco nem envio de notificações por e-mail.
- Não há registro de auditoria: o sistema não guarda quem alterou cada cadastro.

### 11.2 Próximas etapas

Até a versão final, prevista para 10/11/2026:

- publicar a API e o banco em um serviço de hospedagem e o painel em outro, deixando o sistema acessível pela internet;
- definir com o orientador o escopo do módulo de viagens.

## Referências

- POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL Documentation**. Disponível em: https://www.postgresql.org/docs/.
- OPENJS FOUNDATION. **Express Documentation**. Disponível em: https://expressjs.com.
- NODE.JS. **Node.js Documentation**. Disponível em: https://nodejs.org/docs/.
- NODE-POSTGRES. **node-postgres Documentation**. Disponível em: https://node-postgres.com.
- PROVOS, Niels; MAZIÈRES, David. **A Future-Adaptable Password Scheme**. In: USENIX Annual Technical Conference, 1999. Disponível em: https://www.usenix.org/legacy/events/usenix99/provos.html.
- REACT. **React Documentation**. Disponível em: https://react.dev.
- REACT ROUTER. **React Router Documentation**. Disponível em: https://reactrouter.com.
- TAILWIND LABS. **Tailwind CSS Documentation**. Disponível em: https://tailwindcss.com/docs.
- TYPESCRIPT. **TypeScript Documentation**. Disponível em: https://www.typescriptlang.org/docs/.
- VITE. **Vite Documentation**. Disponível em: https://vite.dev.
- VITEST. **Vitest Documentation**. Disponível em: https://vitest.dev.
- ZOD. **Zod Documentation**. Disponível em: https://zod.dev.
