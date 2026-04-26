# Inhouse LoL (Discord + Supabase)

Bot Discord (interações HTTP + `DEFER` + `waitUntil` na Vercel) e base de dados no **Supabase** (grátis), com MMR estilo Elo, fila, sorteio 5v5 e ranking.

**Não edites o ficheiro de plano** do Cursor; a documentação vive aqui e em `docs/mmr-elo.md`.

## Requisitos

- Node 20+
- Conta [Supabase](https://supabase.com) (projeto novo)
- Aplicação [Discord](https://discord.com/developers/applications) (Bot + Interactions Endpoint)

## 1. Base de dados

1. No Supabase: **SQL** → cola o conteúdo de [supabase/migrations/20260426000000_initial.sql](supabase/migrations/20260426000000_initial.sql) e executa.
2. **Authentication** → ativa e-mail (magic link) conforme a documentação do Supabase.
3. Anota o **URL**, **anon key** e **service_role** (Settings → API).

## 2. App web + API Discord (Vercel, gratuito)

1. Copia `.env.example` para `apps/web/.env.local` e preenche as variáveis (em dev; o `next build` também completa sem valores reais graças a *placeholders* no código).
2. `npm install` na raiz do repositório.
3. `npm run build` (compila `@inhouse/core` e a app Next.js).

> Segurança: corre `npm audit` e atualiza o **Next.js** para a versão *patched* indicada no aviso (CVE conhecida em 15.0/15.1).

### Variáveis de ambiente (produção / Vercel)


| Variável                        | Onde                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Web + handler                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web (client)                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Só no servidor: **nunca** no browser                               |
| `DISCORD_APPLICATION_ID`        | Developer Portal                                                   |
| `DISCORD_PUBLIC_KEY`            | Developer Portal, secção "General"                                 |
| `DISCORD_BOT_TOKEN`             | Bot, para o script de registo (e eventualmente outras integrações) |
| `DISCORD_STAFF_ROLE_IDS`        | IDs de cargos (vírgula) que podem `/sortear` e `/resultado`        |


- **Custo**: Supabase e Vercel têm *free tier*; atenção a limites (invocações, linhas, egress).

### Deploy passo a passo (Vercel)

> Este repositório é um **monorepo**. Na Vercel, o projeto que vai ao ar é o `apps/web` (Next.js).

1. **Subir o código para o GitHub**
  - Cria um repositório e faz push do conteúdo de `C:\Users\cayoz\inhouse-lol`.
2. **Importar na Vercel**
  - Vercel → **Add New… → Project** → Importa o repositório.
3. **Configurar como monorepo**
  - Em **Root Directory**, escolhe: `apps/web`
  - Framework: **Next.js** (a Vercel normalmente detecta)
4. **Build & Output**
  - Em geral pode ficar no default. Se precisares forçar:
    - **Install Command**: `npm install`
    - **Build Command**: `npm run build`
  - Nota: o `npm run build` na raiz compila `@inhouse/core` e depois `apps/web`.
5. **Environment Variables (Production)**
  - Vai em Project → **Settings → Environment Variables** e cria:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `DISCORD_APPLICATION_ID`
    - `DISCORD_PUBLIC_KEY`
    - `DISCORD_BOT_TOKEN`
    - `DISCORD_STAFF_ROLE_IDS` (opcional, recomendado)
  - Marca pelo menos o ambiente **Production** (e também Preview, se quiseres testar em branches).
6. **Deploy**
  - Clica Deploy. Ao final, copia a URL do tipo `https://<nome>.vercel.app`.
7. **Ligar o endpoint no Discord**
  - No Developer Portal → tua app → **Interactions**
  - Define **Interaction Endpoint URL** como:
    - `https://<nome>.vercel.app/api/interactions`
  - Salva e confirma que o Discord valida com PING.
8. **Registar slash commands**
  - Localmente (ou GitHub Actions), executa o script de registo (ver secção “Registar slash commands”).
  - Dica: usa `DISCORD_GUILD_ID` para testes rápidos no teu servidor.
9. **Verificação final**
  - No Discord, testa: `/perfil` (deve instruir a vincular), `/entrar`, `/fila`
  - Staff: `/sortear` e depois `/resultado vencedor:A|B`

### Deploy: problemas comuns (Vercel)

- **Interaction Endpoint URL falha ao salvar**
  - Confere se o deploy tem as env vars `DISCORD_PUBLIC_KEY` e `DISCORD_APPLICATION_ID`.
  - Confere se a rota existe: `POST /api/interactions`.
- **401 Invalid signature**
  - `DISCORD_PUBLIC_KEY` incorreto no deploy é o mais comum.
- **Supabase não funciona no site**
  - Confere `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Confere se o projeto Supabase está ativo e o Auth por e-mail está ligado.

## 3. Registar slash commands

```bash
# Na raiz, com as mesmas env (ou export no shell)
set DISCORD_BOT_TOKEN=...
set DISCORD_APPLICATION_ID=...
# opcional: set DISCORD_GUILD_ID=...  — só nesse servidor, mais rápido em teste
node packages/discord-commands/register.mjs
```

Comandos: `vincular`, `perfil`, `entrar`, `sair`, `fila`, `sortear`, `resultado`, `ranking`.

## 4. Discord: integração (Developer Portal)

### 4.1 Criar a aplicação e o bot

1. No Developer Portal, cria uma aplicação.
2. Em **Bot**:
  - Clica **Reset Token** e copia o token (vai para `DISCORD_BOT_TOKEN`).
  - (Opcional) desativa “Public Bot” se quiseres restringir.
3. Em **General Information**:
  - Copia o **Application ID** (`DISCORD_APPLICATION_ID`)
  - Copia o **Public Key** (`DISCORD_PUBLIC_KEY`) — é a chave usada para verificar a assinatura `ed25519` das interações.

### 4.2 Convidar o bot para o servidor (OAuth2)

1. Em **OAuth2 → URL Generator**:
  - **Scopes**: marca `bot` e `applications.commands`
  - **Bot Permissions** (mínimo recomendado): `Send Messages`, `Embed Links`, `Read Message History`
2. Abre o link gerado e adiciona o bot ao servidor.

> Nota: este projeto não usa gateway 24/7; responde via **Interactions endpoint**. Mesmo assim, o bot precisa estar no servidor para os comandos funcionarem.

### 4.3 Registar os comandos (slash)

- Executa o script em [packages/discord-commands/register.mjs](packages/discord-commands/register.mjs).
- Em testes, define `DISCORD_GUILD_ID` para registar apenas no teu servidor (fica disponível em segundos). Global pode demorar mais.

## 5. Discord: URL de Interactions (sem VPS 24/7)

1. Faz deploy da app `apps/web` (Vercel recomendado).
2. No Discord Developer Portal → **Interactions**:
  - Em **Interaction Endpoint URL**, coloca: `https://<teu-dominio-vercel>/api/interactions`
  - Salva. O Discord vai enviar um **PING** para validar.

### Como o endpoint funciona neste projeto

- Rota: `[apps/web/app/api/interactions/route.ts](apps/web/app/api/interactions/route.ts)`
- Segurança: valida assinatura `ed25519` com `X-Signature-Ed25519` + `X-Signature-Timestamp` usando `DISCORD_PUBLIC_KEY` (ver `[apps/web/lib/discord/verify.ts](apps/web/lib/discord/verify.ts)`).
- Latência serverless: responde imediatamente com **DEFER** (`type: 5`, ephemeral) e continua o processamento “em background”.
  - Na Vercel usa `waitUntil` para terminar o trabalho após a resposta.
  - Depois atualiza a mensagem original com `PATCH .../messages/@original` (ver `[apps/web/lib/discord/editOriginal.ts](apps/web/lib/discord/editOriginal.ts)`).

### Checklist rápido de diagnóstico

- **No Developer Portal, ao salvar a Interaction Endpoint URL, dá erro**:
  - Verifica se a rota pública responde a `POST` e se não está atrás de auth.
  - Confere se `DISCORD_PUBLIC_KEY` está correto no ambiente do deploy.
- **Comandos aparecem no Discord mas respondem “Invalid signature” (401)**:
  - `DISCORD_PUBLIC_KEY` errado (mais comum), ou o proxy alterou o body.
- **/sortear ou /resultado “Apenas staff”**:
  - Define `DISCORD_STAFF_ROLE_IDS` com os IDs dos cargos autorizados (se vazio, em dev local fica liberado).

## 6. Staff

- Define `DISCORD_STAFF_ROLE_IDS` com os IDs dos cargos (modo ativar Modo de desenvolvedor no Discord → Clicar com o botão direito no cargo → Copiar ID).
- Se a variável estiver **vazia**, o código trata *sortear* e *resultado* como acessíveis a todos (conveniente para desenvolvimento local, **não** recomendado em produção).

## 7. Testes (MMR, sorteio e assinatura Discord)

```bash
npm test
```

## 8. Fluxo de utilizador

1. Regista no site com o link mágico (`/login`).
2. Página `vincular`: gera código; no Discord, `/vincular codigo:XXXXXX`.
3. Fila: `/entrar` até 10; **staff** `/sortear`; jogam a custom; **staff** `/resultado vencedor: A` ou `B`.
4. `ranking` e página web `/ranking` listam o MMR.

## Limites e notas

- **Resultados** são introduzidos manualmente; combate a griefing: só *staff* em `/resultado`.
- O handler usa **K** provisório (40) até 20 partidas, depois 24; ver [docs/mmr-elo.md](docs/mmr-elo.md).
- A idempotência de partidas concluídas baseia-se em `status = 'pending'`: não há partida pendente em duplicado.

## Estrutura

- `packages/core` — MMR, balanceamento 5v5, testes
- `apps/web` — Next.js: UI (login, código, ranking) e `POST /api/interactions`
- `supabase/migrations` — esquema SQL
- `packages/discord-commands/register.mjs` — registo de slash commands

