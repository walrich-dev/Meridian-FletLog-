# Implantação do Meridian na nuvem, com endereço fixo

Como colocar o sistema no ar em serviços de nuvem, num endereço que não muda e
sem depender do seu computador. Para usar o seu próprio PC como servidor, veja
[SERVIDOR-LOCAL.md](SERVIDOR-LOCAL.md).

```
  internet
     |
  navegador  --->  meridianfleetlog.com.br  --->  Neon
  de quem           (Render: API + painel         (PostgreSQL)
  acessa             no mesmo endereço)
```

**Um único serviço entrega a API e o painel.** Essa decisão simplifica quase
tudo o que vem depois: um endereço só, nenhum CORS para configurar, um domínio
apontando para um lugar só, e nenhum risco de o painel ser gerado com o endereço
errado da API. Quem faz isso é a variável `SERVIR_PAINEL`, e o
[render.yaml](../render.yaml) na raiz do projeto já traz tudo configurado.

| Parte | Serviço | Plano | Custo |
| --- | --- | --- | --- |
| API + painel | [Render](https://render.com) | Free | R$ 0 |
| Banco | [Neon](https://neon.com) | Free | R$ 0 |
| Domínio | [Registro.br](https://registro.br) | — | R$ 40/ano |

---

## Antes de começar: o que não é automático

**Registre o domínio primeiro.** O DNS leva de minutos a algumas horas para
propagar, e o certificado HTTPS só é emitido depois que o Render consegue
resolver o nome. Se você fizer isso por último, vai ficar esperando justamente
no fim. Comece pelo passo 1 mesmo que vá fazer o resto outro dia.

**O plano gratuito do Render hiberna.** Depois de 15 minutos sem ninguém
acessar, o serviço dorme, e a primeira visita seguinte espera cerca de 1 minuto
olhando uma tela de carregamento. Isso vale para o site inteiro, não só para a
API. Como lidar com isso na apresentação está no fim deste guia, em
[Hibernação](#hibernação-o-único-ponto-que-exige-atenção).

---

## Passo 1 — Registrar o domínio

Em <https://registro.br>, pesquise o nome e registre. São R$ 40 por ano, pagos
com CPF e cartão ou boleto, e dá para contratar por até 10 anos de uma vez.

Precisa ser um `.com.br`? Não, mas é o mais barato e o registro é nacional. Um
`.com` custa mais e sai em outro registrador.

Depois de registrar, deixe a tela de **DNS** do Registro.br à mão: você volta
nela no passo 5.

## Passo 2 — Criar o banco no Neon

1. Crie a conta em <https://neon.com> (não pede cartão).
2. Crie um projeto. No campo de região escolha **AWS US East (N. Virginia)**.
3. Copie a **connection string**. Ela tem este formato:

```
postgresql://usuario:senha@ep-algo-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Por que Virginia, e não São Paulo.** O Neon oferece região no Brasil, mas o
Render não. A API conversa com o banco várias vezes para montar uma só tela, e
cada ida e volta paga a latência. Então vale mais o banco estar perto da API do
que perto de você: deixe os dois em Virginia.

> Essa URL contém a senha do banco. Ela não entra em nenhum arquivo do projeto e
> não vai para o GitHub. Guarde no gerenciador de senhas.

## Passo 3 — Criar as tabelas e o seu usuário

Isto roda **na sua máquina**, apontando para o banco na nuvem. No PowerShell, na
pasta `api`:

```powershell
cd api
$env:DATABASE_URL = "cole-aqui-a-connection-string-do-neon"
npm run banco:criar
```

Deve listar 6 tabelas. Em seguida, crie o seu acesso:

```powershell
npm run usuario:criar -- "Seu Nome" voce@email.com SuaSenhaForte ADMIN
```

Três avisos sobre este passo:

- **`banco:criar` começa com `DROP TABLE`:** ele apaga tudo e recria. Rode uma
  vez só, enquanto o banco está vazio. A trava automática que protege isso olha o
  `NODE_ENV` do servidor, não o banco de destino — aqui a responsabilidade é sua.
- **Nunca rode `npm run banco:popular` contra o banco da nuvem.** Ele grava a
  frota de demonstração, e as senhas dela (`Frota@2026`, `Gestor@2026`) estão
  publicadas no README, no GitHub. Qualquer pessoa entraria no sistema.
- **Repetir `usuario:criar` com o mesmo e-mail** troca a senha e encerra as
  sessões abertas. É assim que você recupera o acesso se esquecer a senha.

Quando terminar, feche o terminal: a variável `DATABASE_URL` existe só naquela
janela, e é melhor que ela não fique por aí.

## Passo 4 — Subir no Render

1. Crie a conta em <https://render.com> e conecte o GitHub.
2. **New → Blueprint**, e escolha o repositório `Meridian-FletLog-`.

O Render lê o [render.yaml](../render.yaml) e já monta o serviço configurado: o
comando de build, o de início, o health check e as variáveis de produção. Não há
campo para preencher errado.

3. Ele vai pedir **uma única** variável, a `DATABASE_URL`. Cole a URL do Neon.
   Ela fica guardada no painel do Render, não no repositório.
4. Clique em **Apply**. O primeiro build leva alguns minutos.

Quando terminar, o Render dá um endereço `https://meridian.onrender.com`. Teste:

```powershell
curl https://meridian.onrender.com/api/health
# {"status":"ok","banco":"conectado","horario":"..."}
```

Se vier `"banco":"desconectado"`, a `DATABASE_URL` está errada. Se vier erro de
certificado, confirme que a URL termina em `?sslmode=require` — é esse pedaço
que liga a verificação do certificado do banco.

Abra o endereço no navegador e entre com o usuário do passo 3. O sistema já está
no ar; o que falta é só trocar o endereço pelo seu domínio.

## Passo 5 — Apontar o domínio

Os dois domínios já vêm declarados no `render.yaml`, então o Render os cria
sozinho no passo anterior. Em **Settings → Custom Domains** eles aparecem como
pendentes, e o Render mostra ali os registros de DNS que espera.

**Use os registros que o painel do Render mostrar**, não os deste guia: o
endereço do balanceador pode mudar, e o painel dele é a fonte autoritativa. Hoje
são estes:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` (a raiz) | `216.24.57.1` |
| CNAME | `www` | `meridian.onrender.com` |

No Registro.br, a tela é **DNS → Configurar endereçamento**. Cadastre os dois.
Dois detalhes que travam muita gente:

- **Na raiz do domínio tem que ser `A`, não `CNAME`.** O padrão do DNS não
  permite CNAME na raiz, e o Registro.br não oferece os registros `ALIAS`/`ANAME`
  que contornam isso. É por isso que a raiz usa o IP direto.
- **Apague qualquer registro `AAAA`** que exista. Ele aponta para IPv6, e o
  Render responde só em IPv4: se sobrar um AAAA, parte dos visitantes tenta o
  IPv6 e não chega.

Depois de propagar, o Render emite o certificado HTTPS sozinho e renova sozinho.
Para conferir se o DNS já respondeu:

```powershell
nslookup meridianfleetlog.com.br
```

### Não é preciso configurar CORS

Como a API e o painel saem do mesmo endereço, a API reconhece as chamadas como
sendo da própria origem e as aceita — inclusive no domínio novo, sem você
precisar cadastrar nada. A variável `ORIGEM_PERMITIDA` só é necessária se um dia
você separar o painel da API em endereços diferentes.

---

## Conferência final

- [ ] `https://meridianfleetlog.com.br/api/health` responde `"banco":"conectado"`
- [ ] O painel abre no domínio próprio, com o cadeado do HTTPS
- [ ] `http://` redireciona para `https://` sozinho
- [ ] O login funciona com o usuário que **você** criou
- [ ] `admin@meridian.local` / `Frota@2026` **não** funciona
- [ ] Cadastrar veículo, motorista e manutenção funciona
- [ ] Em Configurações, restaurar demonstração dá erro (travado em produção)
- [ ] Errar a senha 11 vezes devolve *"Muitas tentativas de login"*
- [ ] Funciona no celular, com dados móveis
- [ ] Recarregar a página em `/veiculos` abre a tela, e não um 404

O último item merece explicação: o painel é uma aplicação de página única, e as
rotas dele não existem como arquivos. A API devolve o `index.html` para
qualquer endereço que não comece com `/api`, e é isso que faz o recarregamento
funcionar.

---

## Hibernação: o único ponto que exige atenção

No plano gratuito, 15 minutos sem acesso e o serviço dorme. A visita seguinte
espera cerca de 1 minuto. **Enquanto alguém está usando, ele não dorme** — o
risco é só o da primeira visita.

Para a apresentação, em ordem de preferência:

1. **Abra o sistema 5 minutos antes.** Resolve, é de graça, e é o que basta.
2. **Pague o plano Starter no mês da apresentação** (cerca de US$ 7, uns R$ 38).
   É um botão no painel do Render, sem mexer em código, e dá para voltar ao
   gratuito depois. Se a banca vai clicar no sistema ao vivo, é um seguro barato.

O que **não** recomendo: serviços que ficam pingando o site de 10 em 10 minutos
para mantê-lo acordado. Além de consumir as 750 horas mensais do plano gratuito
em dias, é contornar o limite do serviço em vez de respeitá-lo.

---

## Limitações conhecidas

- **Não há sistema de migração.** O `api/sql/schema.sql` cria as tabelas do zero
  e apaga o que existir. Mudanças futuras no banco, com dados reais dentro,
  precisam ser feitas à mão com `ALTER TABLE`.
- **Sessões expiradas não são removidas.** A tabela `sessoes` só cresce. Não
  afeta o funcionamento, porque a consulta filtra por `expira_em > NOW()`, mas um
  dia conviria uma limpeza periódica.
- **Sem backup automático.** O plano gratuito do Neon não faz cópia de
  segurança. Para guardar o estado antes de uma apresentação:
  `pg_dump "$env:DATABASE_URL" > meridian.sql`
- **O plano gratuito do Render dá 750 horas por mês** por conta, somando todos
  os serviços. Um serviço só, hibernando quando ninguém usa, não chega perto
  disso.
- **O Neon gratuito dá 0,5 GB.** Para a escala deste sistema, é muita folga.

---

## Resumo

Uma vez, na primeira implantação:

```powershell
# 1. registrar o dominio no registro.br
# 2. criar o projeto no neon (regiao Virginia) e copiar a connection string
cd api
$env:DATABASE_URL = "a-connection-string-do-neon"
npm run banco:criar
npm run usuario:criar -- "Seu Nome" voce@email.com SuaSenhaForte ADMIN
# 3. Render: New > Blueprint > o repositorio > colar DATABASE_URL > Apply
# 4. Render: Settings > Custom Domains, e cadastrar o DNS no registro.br
```

Depois disso, **publicar uma mudança é só dar `git push`**: o Render detecta o
commit, gera o painel e a API de novo e troca a versão no ar sem derrubar o
endereço.
