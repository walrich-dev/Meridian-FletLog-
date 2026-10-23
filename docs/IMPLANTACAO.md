# Implantação do Meridian

Como colocar o sistema no ar **em serviços de nuvem**. Para usar o seu próprio
computador como servidor, veja [SERVIDOR-LOCAL.md](SERVIDOR-LOCAL.md).

Como colocar o sistema no ar. São três partes independentes, nesta ordem:

1. **Banco de dados** PostgreSQL
2. **API** (pasta `api/`) — Node.js
3. **Painel** (pasta raiz) — site estático gerado pelo Vite

A ordem importa: a API precisa do banco para subir, e o painel precisa do
endereço da API **antes** de ser gerado.

---

## Onde hospedar

Combinação que funciona no plano gratuito e é suficiente para a apresentação:

| Parte | Serviço | Observação |
| --- | --- | --- |
| Painel | [Vercel](https://vercel.com) | Site estático, build automático a cada push |
| API | [Render](https://render.com) | Web Service Node. No plano gratuito, dorme após 15 min sem uso e leva ~30 s para acordar |
| Banco | Render PostgreSQL | O plano gratuito **expira em 30 dias** |

O [Railway](https://railway.app) hospeda API e banco juntos, sem hibernação,
mas o plano gratuito é por crédito mensal.

> **Atenção ao prazo:** se o banco gratuito do Render expira em 30 dias e a
> entrega final é **10/11/2026**, suba o ambiente a partir do fim de outubro —
> não antes, ou ele vence justamente na semana da entrega.

---

## 1. Banco de dados

Crie a instância PostgreSQL (versão 16 ou superior) e guarde os dados de
conexão. O Render entrega uma URL no formato
`postgres://usuario:senha@host:5432/banco`, de onde saem as variáveis
`PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT` e `PGDATABASE`.

Depois, **uma única vez**, crie as tabelas:

```bash
psql "<URL de conexão>" -f api/sql/schema.sql
```

Confira se as 6 tabelas apareceram:

```bash
psql "<URL de conexão>" -c "\dt"
```

Não rode `npm run banco:popular` em produção: ele apaga tudo e grava a frota de
exemplo, com senhas públicas. Em produção o comando é bloqueado de propósito.

### Primeiro usuário administrador

Como o seed não roda, é preciso criar o primeiro acesso à mão. Gere o hash da
senha na sua máquina:

```bash
cd api
node -e "import('bcryptjs').then(b => b.default.hash('SUA_SENHA_FORTE', 10).then(console.log))"
```

E insira o usuário:

```bash
psql "<URL de conexão>" -c "INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ('Seu Nome', 'voce@empresa.com', '<hash gerado>', 'ADMIN')"
```

Use uma senha de verdade. As senhas de demonstração (`Frota@2026`,
`Gestor@2026`) estão publicadas no repositório e no README.

---

## 2. API

No serviço da API, configure:

| Campo | Valor |
| --- | --- |
| Diretório raiz | `api` |
| Comando de build | `npm install && npm run build` |
| Comando de início | `npm start` |
| Health check | `/api/health` |

Variáveis de ambiente:

| Variável | Valor | Por quê |
| --- | --- | --- |
| `NODE_ENV` | `production` | **Essencial.** Liga as proteções: CORS restrito, restauração de demonstração bloqueada, comandos destrutivos travados |
| `PGHOST` `PGPORT` `PGUSER` `PGPASSWORD` `PGDATABASE` | do banco criado acima | Conexão |
| `ORIGEM_PERMITIDA` | `https://seu-painel.vercel.app` | Endereço real do painel. Sem isto o navegador bloqueia as chamadas |
| `CONFIAR_PROXY` | `1` | A hospedagem põe um proxy na frente. Sem isto o limite por IP veria o IP do proxy em todas as requisições, e valeria para o site inteiro de uma vez |
| `PORT` | deixe a hospedagem definir | O Render injeta automaticamente |

Não envie `PERMITIR_RESTAURAR_DEMONSTRACAO` nem `LIMITE_TAXA`. A primeira é
ignorada em produção; a segunda só serve aos testes automatizados.

Depois do deploy, confira:

```bash
curl https://sua-api.onrender.com/api/health
# {"status":"ok","banco":"conectado","horario":"..."}
```

Se vier `"banco":"desconectado"`, o problema está nas variáveis do PostgreSQL.

---

## 3. Painel

| Campo | Valor |
| --- | --- |
| Diretório raiz | a raiz do repositório |
| Comando de build | `npm run build` |
| Pasta publicada | `dist` |

Variável de ambiente:

| Variável | Valor |
| --- | --- |
| `VITE_API_URL` | `https://sua-api.onrender.com/api` |

> **O `VITE_API_URL` é lido durante o build**, não quando o site roda: o Vite
> grava o valor dentro do JavaScript gerado. Configure a variável **antes** do
> primeiro build. Se trocar o endereço da API depois, é obrigatório buildar de
> novo — não basta reiniciar.

O endereço termina em `/api`, porque é onde a API monta as rotas.

---

## 4. Conferência final

Com as três partes no ar:

- [ ] `GET /api/health` responde `{"status":"ok","banco":"conectado"}`
- [ ] O painel abre e o indicador de status da API aparece conectado
- [ ] O login funciona com o administrador criado no passo 1
- [ ] As senhas de demonstração **não** funcionam (o seed não rodou)
- [ ] Em Configurações, "restaurar dados de demonstração" devolve erro
- [ ] Cadastrar um veículo, um motorista e uma manutenção funciona
- [ ] O endereço é `https://` — o token de sessão viaja no cabeçalho
      `Authorization` e em `http://` seria visível na rede

Para conferir que o limite de tentativas está ativo, erre a senha 11 vezes
seguidas: a partir da 11ª a resposta deve ser *"Muitas tentativas de login"*.

---

## Limitações conhecidas

- **Não há sistema de migração.** O `sql/schema.sql` cria as tabelas do zero e
  apaga o que existir. Mudanças futuras no banco, com dados reais dentro,
  precisam ser feitas à mão com `ALTER TABLE`.
- **Sessões expiradas não são removidas.** A tabela `sessoes` só cresce. Não
  afeta o funcionamento (a consulta filtra por `expira_em > NOW()`), mas um dia
  conviria uma limpeza periódica.
- **A API dorme** no plano gratuito do Render. A primeira chamada depois de 15
  minutos de inatividade leva cerca de 30 segundos. Se for apresentar ao vivo,
  abra o sistema alguns minutos antes.
