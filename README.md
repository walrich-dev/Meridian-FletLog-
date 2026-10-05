# Meridian

Painel web de controle de frota para pequenas empresas de logística e transporte.
Trabalho de Curso (TC) do Bacharelado em Sistemas de Informação, IESGO, 2026/2.

> **Versão 0.2 (inicial):** front-end completo, funcionando com uma **API simulada no navegador**. Os dados de demonstração ficam salvos no próprio navegador (`localStorage`), então o sistema roda sem servidor nem banco de dados.

## Funcionalidades

| Código | Requisito | O que foi implementado |
| --- | --- | --- |
| RNF01 | Autenticação de usuários | Login com e-mail e senha, todas as telas protegidas, perfis Administrador e Gestor de frota, gestão de usuários e troca de senha |
| RF01 | Cadastro, consulta, edição e exclusão de veículos e motoristas | Listagens com busca e filtros, formulários com validação (placa, chassi, RENAVAM, CPF, CNH), bloqueio de duplicidade, vínculo motorista–veículo, exclusão lógica com reativação |
| RF02 | Dashboard com indicadores de quilometragem, custos e manutenções | Indicadores da frota, custo mensal dos últimos 12 meses, preventiva × corretiva, custo e quilometragem por veículo |
| RF03 | Alertas de manutenção preventiva por km ou data | Situação calculada (em dia, próxima do limite, vencida), antecedência configurável, preventivas recorrentes programadas automaticamente ao concluir, alertas de CNH vencida ou vencendo |

## Tecnologias

React 19, TypeScript, Vite, React Router, Tailwind CSS, lucide-react (ícones), Zod (validação), Vitest (testes) e oxlint (análise estática).

### Identidade visual

- **Paleta azul** definida como tema no `src/index.css` (classes `bg-marca-600`, `text-marca-700` etc.). Para mudar a cor do sistema inteiro, basta trocar esses valores.
- Verde, amarelo e vermelho ficam reservados para status (em dia, atenção, vencido), sempre acompanhados de texto.
- Fonte **Plus Jakarta Sans**, empacotada no projeto (funciona sem internet).
- Layout responsivo: no celular, o menu vira uma gaveta e as listagens viram cartões.

## Como executar

Pré-requisito: [Node.js](https://nodejs.org) 22.12 ou superior (desenvolvido com o 24).

```bash
npm install
npm run dev
```

Abra <http://localhost:5173>. Na tela de login há atalhos para os acessos de demonstração:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@meridian.local` | `Frota@2026` |
| Gestor de frota | `gestor@meridian.local` | `Gestor@2026` |

Os usuários de demonstração são pessoas fictícias (Mariana Costa, administradora, e Rafael Alves, gestor). O gestor opera cadastros e manutenções; só o administrador gerencia usuários e altera a antecedência dos alertas.

### Dados de demonstração

Na primeira vez que o painel é aberto, são criados 6 veículos (um deles inativo), 5 motoristas e 24 manutenções, com um ano de histórico de custos. As datas são relativas ao dia da criação, para que sempre existam situações de alerta: preventiva vencida por data e por km, preventivas próximas do limite, CNH vencida e CNH vencendo.

Para recomeçar (por exemplo, no dia da apresentação), entre como administrador e use **Configurações → Restaurar dados de demonstração**.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o painel em modo desenvolvimento |
| `npm test` | Roda os testes automatizados (regras de negócio e API simulada) |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run lint` | Analisa o código com o oxlint |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Serve a versão de produção localmente |

## Estrutura

```
src/
├── auth/              login, sessão e rotas protegidas (RNF01)
├── components/        layout, gráficos, badges, filtros e componentes de interface (ui/)
├── hooks/             consulta à API e estado de formulários
├── lib/
│   ├── api.ts         cliente da API: simulada ou real, conforme VITE_API_URL
│   ├── tipos.ts       formato dos dados trocados com a API
│   ├── formatacao.ts  datas, moeda, km, placa, CPF e rótulos
│   └── mascaras.ts    máscaras dos campos (CPF, telefone, placa...)
├── pages/             telas do sistema
├── simulador/         API simulada no navegador
│   ├── modulos/       uma parte por assunto: veículos, motoristas, manutenções, alertas, dashboard...
│   ├── regras/        regras puras: situação das manutenções, validações, datas, documentos
│   ├── banco.ts       "tabelas" guardadas no localStorage
│   ├── dados-iniciais.ts  frota de demonstração
│   └── index.ts       roteador: atende cada rota como a API real atenderia
├── router.tsx         rotas do painel
└── main.tsx
```

## API simulada

O painel conversa com uma API REST por meio de `src/lib/api.ts`. Nesta versão, essa API é simulada em `src/simulador/`: ela atende as mesmas rotas, com as mesmas validações, regras de negócio, mensagens de erro e códigos HTTP que uma API real teria. Cada alteração é feita numa cópia dos dados e só é gravada se der certo, como uma transação de banco de dados. As senhas são guardadas com sal e hash SHA-256, nunca em texto puro.

**Limitação:** como os dados ficam no navegador, cada navegador tem a sua própria cópia, e o login protege a interface, mas não os dados. Para uso real, é necessária uma API com banco de dados no servidor.

### Ligando a uma API real

Crie um arquivo `.env` (a partir do `.env.example`) com o endereço da API:

```
VITE_API_URL=https://endereco-da-api/api
```

Com isso, o painel passa a fazer requisições HTTP para esse endereço, e o simulador nem é carregado. A API precisa atender as rotas abaixo, enviando e recebendo JSON no formato de `src/lib/tipos.ts`. Exceto `GET /health` e `POST /auth/login`, todas recebem o cabeçalho `Authorization: Bearer <token>`. Erros devem seguir o formato `{ "mensagem": "...", "detalhes": { "campo": ["mensagem"] } }`, usado para destacar o campo no formulário.

| Método e rota | Descrição |
| --- | --- |
| `GET /health` | Situação da API e do banco |
| `POST /auth/login` | `{ email, senha }` → `{ token, usuario }` |
| `POST /auth/logout` · `GET /auth/me` · `PUT /auth/senha` | Sair, usuário logado e troca de senha |
| `GET` `POST /usuarios` · `PUT /usuarios/:id` | Gestão de usuários (somente ADMIN) |
| `GET` `POST /veiculos` · `GET` `PUT` `DELETE /veiculos/:id` | Veículos (o DELETE é exclusão lógica) |
| `PATCH /veiculos/:id/km` · `POST /veiculos/:id/reativar` | Atualizar hodômetro e reativar |
| `GET` `POST /motoristas` · `GET` `PUT` `DELETE /motoristas/:id` · `POST /motoristas/:id/reativar` | Motoristas |
| `GET` `POST /manutencoes` · `GET` `PUT` `DELETE /manutencoes/:id` | Manutenções |
| `POST /manutencoes/:id/concluir` · `POST /manutencoes/:id/cancelar` | Concluir (programa a próxima preventiva) e cancelar |
| `GET /alertas` · `GET /dashboard` | Alertas (RF03) e indicadores (RF02) |
| `GET` `PUT /configuracoes` | Antecedência dos alertas (alteração somente ADMIN) |

As listagens aceitam filtros na query string (ex.: `/veiculos?busca=&status=`, `/manutencoes?veiculoId=&status=&tipo=&situacao=&busca=`). O comportamento esperado de cada rota está implementado em `src/simulador/modulos/` e coberto pelos testes em `src/simulador/simulador.test.ts`.

## Regras de negócio

- **Situação da manutenção pendente:** *vencida* quando passou da data programada ou o veículo atingiu o km limite; *próxima do limite* quando faltam até N dias ou N km (antecedência configurável, padrão 15 dias e 500 km); com data e km, vale o que vencer primeiro. É calculada a cada consulta, nunca gravada.
- **Recorrência:** ao concluir uma preventiva com intervalo (ex.: a cada 10.000 km ou 180 dias), a próxima é programada a partir do km e da data em que o serviço foi feito.
- **Hodômetro:** só avança. A conclusão de uma manutenção com km maior atualiza o km do veículo.
- **Exclusão lógica:** veículos e motoristas inativados saem das listagens e dos alertas, mas o histórico de custos é mantido. Manutenções realizadas não podem ser excluídas, só corrigidas.
- **"Hoje"** é calculado no fuso de Brasília, independentemente do computador.

## Próximas etapas

Até a versão final (10/11/2026):

- Implantação do painel (ex.: Vercel)
- Integração com uma API real, se fizer parte do escopo final
- Definir com o orientador o módulo de viagens
- Visualização em cartões no celular para as listagens
