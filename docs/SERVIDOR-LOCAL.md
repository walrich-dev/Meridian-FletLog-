# Rodar o Meridian no seu computador e deixar na web

Este guia é para o caso de o servidor ser o **seu próprio PC**, com o sistema
acessível de qualquer lugar pela internet. Se preferir hospedar em nuvem (Vercel
e Render), veja [IMPLANTACAO.md](IMPLANTACAO.md).

A ideia é esta:

```
  internet                       seu PC
     |
  navegador  --->  túnel  --->  API (porta 3333)  --->  PostgreSQL
  de quem                        |
  acessa                         +--> também entrega o painel (dist/)
```

Duas decisões que simplificam muito:

- **A API serve o painel também.** Em vez de dois endereços, fica um só. Sem
  CORS para configurar, e um túnel em vez de dois.
- **Túnel em vez de abrir porta no roteador.** Sem mexer na sua rede, sem expor
  o IP da sua casa, e com HTTPS pronto. Funciona até em internet que não dá IP
  público (o caso da maioria das operadoras no Brasil hoje).

---

## ⚠️ Antes de qualquer coisa: as senhas de demonstração são públicas

`admin@meridian.local` / `Frota@2026` e `gestor@meridian.local` / `Gestor@2026`
estão **no README e no código, no seu GitHub**. Qualquer pessoa que achar o
repositório entra no sistema.

Enquanto o sistema roda só na sua máquina, não tem problema. **No momento em que
ele fica na internet, tem.** O passo 4 resolve isso, e não é opcional.

---

## Passo 1 — Preparar o banco

O PostgreSQL continua como está, só na sua máquina: **o túnel expõe apenas a
API**, não o banco. Mas vale trocar a senha `1234` por uma de verdade, porque
qualquer programa rodando no seu PC consegue se conectar com ela:

```powershell
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'uma-senha-boa-aqui'"
```

Depois atualize `PGPASSWORD` em `api/.env`.

## Passo 2 — Gerar o painel

Na raiz do projeto:

```powershell
npm run build:servidor
```

Este comando é diferente do `npm run build`: ele grava `VITE_API_URL=/api`, ou
seja, o painel vai chamar a API no **mesmo endereço** em que ele estiver. É isso
que permite o endereço único.

> O valor fica gravado dentro do JavaScript gerado, não é lido quando o site
> roda. Se um dia quiser separar painel e API, é preciso gerar de novo.

## Passo 3 — Compilar e subir a API

```powershell
cd api
npm run build
npm run servidor
```

O `npm run servidor` sobe a API com `NODE_ENV=production` e
`SERVIR_PAINEL=../dist`. Deve aparecer:

```
Painel servido de C:\...\TCC-projeto\dist
Meridian API no ar em http://localhost:3333/api
Banco: meridian em localhost
```

Abra <http://localhost:3333> no navegador: o painel inteiro deve funcionar,
agora num só endereço.

**Deixe este terminal aberto.** Fechar derruba o sistema.

## Passo 4 — Criar o seu usuário e apagar os de demonstração

Em **outro** terminal (o primeiro está ocupado com a API):

```powershell
cd api
npm run usuario:criar -- "Seu Nome" voce@email.com SuaSenhaForte ADMIN
```

Entre no painel com esse acesso para confirmar que funciona. **Só depois**,
apague os de demonstração:

```powershell
psql -U postgres -d meridian -c "DELETE FROM usuarios WHERE email IN ('admin@meridian.local', 'gestor@meridian.local')"
```

Nesta ordem: se apagar antes de criar o seu, você fica sem nenhum administrador
e sem como entrar.

Rodar `npm run usuario:criar` de novo com o mesmo e-mail troca a senha e encerra
as sessões abertas — é o jeito de recuperar o acesso se esquecer a senha.

> Os veículos, motoristas e manutenções de demonstração podem ficar: eles são
> só dados de exemplo, não dão acesso a ninguém. Para começar com a base vazia,
> rode `npm run banco:criar` (apaga tudo) e refaça este passo 4.

## Passo 5 — Instalar o túnel

```powershell
winget install --id Cloudflare.cloudflared
```

Feche e abra o terminal depois de instalar, para o comando entrar no PATH.

## Passo 6 — Abrir o túnel

Em um **terceiro** terminal:

```powershell
cloudflared tunnel --url http://localhost:3333
```

Ele imprime um endereço parecido com este:

```
https://alguma-coisa-aleatoria.trycloudflare.com
```

**Esse é o endereço do seu sistema na internet.** Já vem com HTTPS, sem conta,
sem cadastro, sem configurar roteador. Abra no celular, usando dados móveis,
para confirmar que está acessível de fora da sua rede.

**Deixe este terminal aberto também.**

### O endereço muda a cada vez

Esse modo rápido sorteia um endereço novo sempre que você reinicia o túnel. Para
uma apresentação, serve bem: abra na hora e use o endereço do momento.

Se quiser um endereço fixo, é preciso uma conta gratuita na Cloudflare e um
domínio apontado para ela:

```powershell
cloudflared tunnel login
cloudflared tunnel create meridian
cloudflared tunnel route dns meridian meridian.seu-dominio.com
cloudflared tunnel run --url http://localhost:3333 meridian
```

---

## Conferência final

Com os três terminais abertos (API, túnel e o seu de comandos):

- [ ] O endereço `trycloudflare.com` abre o painel
- [ ] O login funciona com o usuário que **você** criou
- [ ] As senhas de demonstração **não** funcionam mais
- [ ] Funciona no celular com dados móveis, fora do seu Wi-Fi
- [ ] Cadastrar veículo, motorista e manutenção funciona
- [ ] Errar a senha 11 vezes devolve *"Muitas tentativas de login"*
- [ ] Em Configurações, restaurar demonstração dá erro (travado em produção)

---

## Cuidados

**O PC precisa ficar ligado e sem dormir.** Se ele hibernar, o sistema sai do
ar. Para desligar a hibernação enquanto estiver no ar:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

(Para voltar ao normal, troque o `0` por `30`, em minutos.)

**O túnel aponta só para a porta 3333.** Nada mais do seu computador fica
exposto: nem o PostgreSQL, nem arquivos, nem outras portas. O Firewall do
Windows não precisa de nenhuma regra nova, porque é o `cloudflared` que abre a
conexão de dentro para fora.

**Sua internet carrega o acesso.** Cada pessoa usando o sistema consome a sua
banda de upload, que em conexões domésticas é bem menor que a de download. Para
poucos usuários simultâneos, como numa apresentação, não é problema.

**Quando terminar**, feche os terminais do túnel e da API. O sistema sai do ar e
seu PC deixa de estar acessível.

---

## Resumo dos comandos

Primeira vez:

```powershell
npm run build:servidor            # na raiz
cd api
npm run build
npm run usuario:criar -- "Seu Nome" voce@email.com SuaSenhaForte ADMIN
winget install --id Cloudflare.cloudflared
```

Toda vez que quiser colocar no ar (dois terminais):

```powershell
cd api ; npm run servidor                          # terminal 1
cloudflared tunnel --url http://localhost:3333     # terminal 2
```

Depois de mexer no código do painel, gere de novo antes de subir:

```powershell
npm run build:servidor
```
