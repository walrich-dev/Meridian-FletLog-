# Meridian

Sistema web de controle de frota para pequenas empresas de logística e transporte.
Trabalho de Curso (TC) do Bacharelado em Sistemas de Informação, IESGO, 2026/2.

> **Versão 1.0:** painel web, API REST e banco de dados PostgreSQL.

## Funcionalidades

| Código | Requisito | O que foi implementado |
| --- | --- | --- |
| RNF01 | Autenticação de usuários | Login com e-mail e senha, todas as telas protegidas, perfis Administrador e Gestor de frota, gestão de usuários e troca de senha |
| RF01 | Cadastro, consulta, edição e exclusão de veículos e motoristas | Listagens com busca e filtros, formulários com validação (placa, chassi, RENAVAM, CPF, CNH), bloqueio de duplicidade, vínculo motorista–veículo, exclusão lógica com reativação |
| RF02 | Dashboard com indicadores de quilometragem, custos e manutenções | Indicadores da frota, custo mensal dos últimos 12 meses, preventiva × corretiva, custo e quilometragem por veículo |
| RF03 | Alertas de manutenção preventiva por km ou data | Situação calculada (em dia, próxima do limite, vencida), antecedência configurável, preventivas recorrentes programadas automaticamente ao concluir, alertas de CNH vencida ou vencendo |

## Como está organizado

```
TCC-projeto/
├── src/      painel web (front-end)
├── api/      API REST e banco de dados (back-end)
└── docs/     documentação e modelagem do banco
```

O painel não acessa o banco diretamente: ele conversa com a API por HTTP, no padrão REST.
A API é a única que fala com o PostgreSQL.

```
Navegador  →  Painel (React)  →  API REST (Express)  →  PostgreSQL
```

## Tecnologias

**Painel:** React 19, TypeScript, Vite, React Router, Tailwind CSS, lucide-react (ícones) e Zod (validação).

**API:** Node.js, TypeScript, Express, PostgreSQL com node-postgres (SQL escrito à mão), Zod (validação), bcrypt (senhas) e Vitest (testes).

### Identidade visual

- **Paleta azul** definida como tema no `src/index.css` (classes `bg-marca-600`, `text-marca-700` etc.). Para mudar a cor do sistema inteiro, basta trocar esses valores.
- Verde, amarelo e vermelho ficam reservados para status (em dia, atenção, vencido), sempre acompanhados de texto.
- Fonte **Plus Jakarta Sans**, empacotada no projeto (funciona sem internet).
- Layout responsivo: no celular, o menu vira uma gaveta e as listagens viram cartões.

## Como executar

Pré-requisitos: [Node.js](https://nodejs.org) 22.12 ou superior e [PostgreSQL](https://www.postgresql.org/download/) 16 ou superior.

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

Abra <http://localhost:5173>. Durante o desenvolvimento, a tela de login mostra atalhos para os acessos de teste:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@meridian.local` | `Frota@2026` |
| Gestor de frota | `gestor@meridian.local` | `Gestor@2026` |

Os usuários de demonstração são pessoas fictícias (Mariana Costa, administradora, e Rafael Alves, gestor). O gestor opera cadastros e manutenções; só o administrador gerencia usuários e altera a antecedência dos alertas.

### Dados de demonstração

O comando `npm run banco:popular` cria 6 veículos (um deles inativo), 5 motoristas e 24 manutenções, com um ano de histórico de custos. As datas são relativas ao dia da criação, para que sempre existam situações de alerta: preventiva vencida por data e por km, preventivas próximas do limite, CNH vencida e CNH vencendo.

Para recomeçar (por exemplo, no dia da apresentação), entre como administrador e use **Configurações → Restaurar dados de demonstração**, ou rode `npm run banco:popular` na pasta `api`.

## Scripts

**Painel** (pasta do projeto)

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o painel em modo desenvolvimento |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run lint` | Analisa o código com o oxlint |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Serve a versão de produção localmente |

**API** (pasta `api`): veja [api/README.md](api/README.md).

## Testes

A API tem **63 testes automatizados** (`cd api && npm test`), executados contra um banco PostgreSQL de verdade. Eles cobrem a autenticação e os perfis, os cadastros e as validações de documentos, as regras das manutenções e dos alertas, os indicadores do dashboard e o comportamento das transações.

## Regras de negócio

- **Situação da manutenção pendente:** *vencida* quando passou da data programada ou o veículo atingiu o km limite; *próxima do limite* quando faltam até N dias ou N km (antecedência configurável, padrão 15 dias e 500 km); com data e km, vale o que vencer primeiro. É calculada a cada consulta, nunca gravada.
- **Recorrência:** ao concluir uma preventiva com intervalo (ex.: a cada 10.000 km ou 180 dias), a próxima é programada a partir do km e da data em que o serviço foi feito.
- **Hodômetro:** só avança. A conclusão de uma manutenção com km maior atualiza o km do veículo.
- **Exclusão lógica:** veículos e motoristas inativados saem das listagens e dos alertas, mas o histórico de custos é mantido. Manutenções realizadas não podem ser excluídas, só corrigidas.
- **"Hoje"** é calculado no fuso de Brasília, independentemente do computador.

## Documentação

- [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md) — documentação completa do projeto
- [docs/Meridian-Documentacao.docx](docs/Meridian-Documentacao.docx) — a mesma documentação em Word, no formato ABNT
- [docs/Meridian-Requisitos.docx](docs/Meridian-Requisitos.docx) — documento de requisitos: RF, RNF, regras de negócio e rastreabilidade
- [docs/Meridian-Manual-do-Usuario.docx](docs/Meridian-Manual-do-Usuario.docx) — manual de operação do sistema, com capturas de tela
- [docs/Meridian-Plano-de-Negocios.docx](docs/Meridian-Plano-de-Negocios.docx) — plano de negócios: mercado, modelo, projeções e riscos
- [docs/modelagem-banco-de-dados.png](docs/modelagem-banco-de-dados.png) — modelo do banco de dados
- [docs/IMPLANTACAO.md](docs/IMPLANTACAO.md) — como hospedar em nuvem (Vercel, Render)
- [docs/SERVIDOR-LOCAL.md](docs/SERVIDOR-LOCAL.md) — como rodar no próprio computador e deixar acessível na web

## Próximas etapas

Até a versão final (10/11/2026):

- Implantação do painel e da API (ex.: Vercel e Render)
- Definir com o orientador o módulo de viagens
