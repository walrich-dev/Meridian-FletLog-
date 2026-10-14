# Meridian API

API REST de controle de frota, em Node.js com TypeScript, Express e PostgreSQL.
É o back-end do painel que fica na pasta acima.

## Como executar

Pré-requisitos: [Node.js](https://nodejs.org) 22.12 ou superior e [PostgreSQL](https://www.postgresql.org/download/) 16 ou superior.

```bash
npm install
cp .env.example .env     # e preencha a senha do PostgreSQL em PGPASSWORD
npm run banco:recriar    # cria as tabelas e grava os dados de demonstração
npm run dev              # sobe a API em http://localhost:3333/api
```

O comando `banco:recriar` espera que o banco `meridian` já exista. Para criá-lo:

```bash
psql -U postgres -c "CREATE DATABASE meridian"
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API e reinicia a cada alteração no código |
| `npm test` | Roda os 63 testes automatizados (usa o banco `meridian_teste`) |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm start` | Executa a versão de produção |
| `npm run banco:criar` | Cria as tabelas a partir de `sql/schema.sql` (apaga os dados) |
| `npm run banco:popular` | Grava a frota de demonstração |
| `npm run banco:recriar` | Os dois anteriores, em sequência |

Para rodar os testes, crie o banco de teste uma vez:

```bash
psql -U postgres -c "CREATE DATABASE meridian_teste"
```

## Configuração (`.env`)

| Variável | Para que serve |
| --- | --- |
| `PGHOST` · `PGPORT` · `PGUSER` · `PGPASSWORD` · `PGDATABASE` | Conexão com o PostgreSQL |
| `PORT` | Porta da API (padrão 3333) |
| `ORIGEM_PERMITIDA` | Endereços do painel autorizados a chamar a API (CORS), separados por vírgula. Em desenvolvimento, qualquer porta de `localhost` também é aceita |
| `PERMITIR_RESTAURAR_DEMONSTRACAO` | `true` libera a restauração dos dados de exemplo. Deixe desligado em um sistema em uso: a restauração apaga tudo |

O arquivo `.env` não vai para o GitHub.

## Organização

```
api/
├── sql/
│   └── schema.sql       tabelas, tipos, chaves e verificações (CHECK)
└── src/
    ├── index.ts         coloca a API no ar
    ├── app.ts           monta o Express: rotas e tratamento de erros
    ├── banco.ts         conexão com o PostgreSQL, consultas e transações
    ├── autenticacao.ts  confere o token e o perfil de cada requisição
    ├── consultas.ts     trechos de SQL reaproveitados
    ├── erros.ts         erros que viram respostas HTTP
    ├── rotas/           uma parte por assunto: veículos, motoristas, manutenções...
    ├── regras/          regras puras: situação, recorrência, validações, senhas
    ├── scripts/         criação do banco e dados de demonstração
    └── testes/          testes da API contra um PostgreSQL de verdade
```

## Decisões

- **SQL escrito à mão**, com o `node-postgres`, em vez de um ORM. As consultas ficam visíveis e os recursos do PostgreSQL (`FILTER`, `GROUP BY`, `unaccent`) são usados diretamente.
- **Transações** nas operações que alteram mais de uma tabela. Concluir uma manutenção atualiza o hodômetro e programa a próxima preventiva: ou tudo acontece, ou nada muda.
- **As somas do dashboard são feitas pelo banco** (`SUM`, `COUNT`, `GROUP BY`). Só a situação das manutenções é calculada em JavaScript, porque depende da data de hoje.
- **Senhas com bcrypt**, que é propositalmente lento para dificultar ataques de força bruta.
- **Sessões em tabela**, com token aleatório de 64 caracteres e validade de 8 horas. Inativar um usuário apaga as sessões dele na hora.
- **As colunas usam `snake_case`** (padrão do PostgreSQL) e o painel recebe `camelCase` (padrão do JavaScript). A conversão é feita no próprio `SELECT`, com `AS "kmAtual"`.

## Rotas

Todas respondem JSON em `/api`. Exceto `GET /health` e `POST /auth/login`, todas exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Acesso |
| --- | --- | --- |
| GET | `/health` | Público |
| POST | `/auth/login` | Público |
| POST · GET · PUT | `/auth/logout` · `/auth/me` · `/auth/senha` | Logado |
| GET · POST · PUT | `/usuarios` · `/usuarios/:id` | Admin |
| GET · POST · PUT · DELETE | `/veiculos` · `/veiculos/:id` | Logado |
| PATCH · POST | `/veiculos/:id/km` · `/veiculos/:id/reativar` | Logado |
| GET · POST · PUT · DELETE | `/motoristas` · `/motoristas/:id` | Logado |
| POST | `/motoristas/:id/reativar` | Logado |
| GET · POST · PUT · DELETE | `/manutencoes` · `/manutencoes/:id` | Logado |
| POST | `/manutencoes/:id/concluir` · `/manutencoes/:id/cancelar` | Logado |
| GET | `/alertas` · `/dashboard` | Logado |
| GET · PUT | `/configuracoes` | Logado · alteração Admin |
| POST | `/demonstracao/restaurar` | Admin |

Erros seguem o formato abaixo, e o painel usa `detalhes` para destacar o campo no formulário:

```json
{ "mensagem": "Já existe um cadastro com esta placa.", "detalhes": { "placa": ["Já existe um cadastro com esta placa."] } }
```

Códigos: 200 (sucesso), 201 (criado), 204 (sem conteúdo), 400 (dados inválidos), 401 (sem login), 403 (sem permissão), 404 (não encontrado), 409 (duplicado).
