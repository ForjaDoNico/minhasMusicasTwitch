# Songlist — repertório e fila de pedidos para streamers da Twitch

Streamers mantêm um repertório; espectadores pedem músicas pelo **chat da Twitch** ou pelo **site**; tudo entra numa **fila ao vivo** que atualiza em tempo real para todo mundo (página pública, painel e overlay do OBS).

Roda **100% nos planos gratuitos** da Vercel (Hobby) e do Supabase (Free): sem servidor sempre ligado, sem worker `tmi.js`, sem Redis.

| Camada | Como |
| --- | --- |
| App | Next.js 16 (App Router) + TypeScript + Tailwind 4, tema escuro padrão com alternância claro/escuro, PT-BR/EN |
| Banco | Supabase Postgres, migrations em `supabase/migrations`, **RLS em todas as tabelas** |
| Lógica da fila | Funções SQL transacionais (`request_song`, `play_next`, `reorder_queue`, …) com `SELECT … FOR UPDATE` no canal → sem corrida de posições |
| Tempo real | Supabase Realtime (Postgres Changes) no canal `queue:{channelId}`; toda mutação incrementa `channels.queue_version` |
| Login | Supabase Auth com provider Twitch |
| Bot de chat | Twitch **EventSub webhook** (`channel.chat.message`) → `/api/twitch/eventsub` (HMAC + idempotência) → resposta via **Helix `POST /chat/messages`** |
| Cooldowns / rate limit | Postgres (`bot_commands.last_used_at`, tabela `rate_limits`) |
| Keep-alive | Cada visita à página pública consulta o banco + Vercel Cron diário em `/api/keepalive` |

> O acesso ao banco é feito com `@supabase/supabase-js` (HTTP/PostgREST), então funções serverless **não abrem conexões Postgres diretas** — não há risco de estourar o limite de conexões.

---

## Rodando localmente

Pré-requisitos: Node 20+, pnpm, Docker (para o Supabase local).

```bash
pnpm install
pnpm db:start                 # sobe o Supabase local, aplica migrations e seed
pnpm supabase status -o env   # copie ANON_KEY e SERVICE_ROLE_KEY
cp .env.example .env.local    # preencha as chaves acima
# para testar sem Twitch:
#   NEXT_PUBLIC_ENABLE_DEV_LOGIN=true  BOT_DRY_RUN=true  TWITCH_EVENTSUB_SECRET=qualquer-coisa
pnpm dev
```

Abra:

- http://localhost:3000/t/demo — canal de exemplo (50 músicas, ~80 entradas de histórico, 2 sugestões na lista de aprendizado)
- http://localhost:3000/dev/login — login local sem Twitch (somente com `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true`):
  - `streamer@demo.local` (dono do canal), `mod@demo.local` (moderador), `viewer@demo.local` — senha `demo1234`
- http://localhost:3000/dashboard — painel do streamer
- http://localhost:3000/overlay/demo — overlay do OBS (fundo transparente; `?next=5` para mostrar 5 próximas)
- http://127.0.0.1:54323 — Supabase Studio

### Simulando o chat da Twitch

O script assina o payload como a Twitch faria e envia para o webhook local. Com `BOT_DRY_RUN=true` a resposta do bot aparece no terminal do `pnpm dev`.

```bash
pnpm simulate:chat --verify                             # handshake webhook_callback_verification
pnpm simulate:chat "!pedir wonderwal | pra minha mãe" --user Alice
pnpm simulate:chat "!pedir beatles" --user Bob             # ambíguo → 3 opções
pnpm simulate:chat "!pedir bohemian rhapsody"              # não encontrado → sugere a lista de aprendizado
pnpm simulate:chat "!pedir asa branca" --badges subscriber,vip
pnpm simulate:chat "!tocando" ; pnpm simulate:chat "!next" ; pnpm simulate:chat "!errei"
pnpm simulate:chat --online   # stream.online → abre a sessão "nesta live"
```

### Testes

```bash
pnpm test        # unitários (Vitest): fuzzy match, parser de comandos, templates, fila, CSV, assinatura EventSub
pnpm test:db     # pgTAP: RPCs da fila, limites, permissões/RLS, cooldown
pnpm test:e2e    # Playwright: pedir → tocar → próxima, com 2 navegadores verificando o tempo real
pnpm test:all    # lint + typecheck + tudo acima
```

Os testes e2e precisam do Supabase local rodando e de `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` no `.env.local` (eles reutilizam o `pnpm dev` se já estiver de pé).

---

## Deploy (Vercel Hobby + Supabase Free)

### 1. Supabase

1. Crie um projeto em https://supabase.com.
2. Aplique as migrations no projeto da nuvem (o `<ref>` é o Project ID, visível na URL do painel e em `https://<ref>.supabase.co`):
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <ref>
   pnpm supabase db push --remote          # pede a senha do banco (ou use -p '...')
   pnpm supabase migration list --remote   # confira: a migration deve aparecer nas colunas local e remote
   ```
   > ⚠️ Nesta versão da CLI os comandos `db`/`migration` apontam para o banco **local** por padrão — sem `--remote` o push "dá certo" mas não muda nada na nuvem.
   >
   > **Não** rode o `seed.sql` em produção — ele cria usuários com senha fixa.
3. **Authentication → Providers → Twitch**: habilite com o Client ID/Secret do app da Twitch.
4. **Authentication → URL Configuration**: Site URL = `https://seu-app.vercel.app`; Redirect URLs: `https://seu-app.vercel.app/auth/callback`.

### 2. App na Twitch (https://dev.twitch.tv/console/apps)

OAuth Redirect URLs (as duas):

- `https://<ref>.supabase.co/auth/v1/callback` — login (Supabase Auth)
- `https://seu-app.vercel.app/api/twitch/callback` — autorização do bot

### 3. Vercel

Importe o repositório e configure as variáveis de `.env.example`:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (secreta; só no servidor) |
| `NEXT_PUBLIC_APP_URL` | `https://seu-app.vercel.app` (usada no callback do EventSub e nos links do bot) |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | app da Twitch |
| `TWITCH_EVENTSUB_SECRET` | string aleatória de 10–100 caracteres |
| `TWITCH_BOT_USER_ID`, `TWITCH_BOT_LOGIN` | opcional: conta dedicada do bot (veja abaixo) |
| `CRON_SECRET` | string aleatória (a Vercel envia automaticamente no cron) |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | `false` (**nunca** `true` em produção) |

O `vercel.json` registra um cron diário (`/api/keepalive`), permitido no plano Hobby.

### 4. Bot de chat

O bot usa um **app access token** (client credentials) — nenhum token de usuário é armazenado. Para isso a Twitch exige que as autorizações existam:

- **Sem conta dedicada** (`TWITCH_BOT_USER_ID` vazio): o próprio streamer responde no chat. No Painel, "Autorizar bot no meu chat" pede `channel:bot user:read:chat user:write:chat user:bot`.
- **Com conta dedicada**: defina `TWITCH_BOT_USER_ID`/`TWITCH_BOT_LOGIN`, logue no site com a conta do bot **uma vez** e acesse `/api/twitch/authorize?type=bot` (concede `user:read:chat user:write:chat user:bot`). Cada streamer então autoriza apenas `channel:bot` pelo Painel.

Ao autorizar, o app cria as inscrições EventSub `channel.chat.message`, `stream.online` e `stream.offline` com transporte **webhook** apontando para `/api/twitch/eventsub`. O webhook:

- verifica a assinatura HMAC-SHA256 (`id + timestamp + corpo`) e rejeita mensagens com mais de 10 minutos;
- responde ao `webhook_callback_verification` com o `challenge`;
- é idempotente: o `Twitch-Eventsub-Message-Id` é gravado em `eventsub_messages` e reenvios são ignorados;
- responde `204` imediatamente e processa o comando com `after()` dentro do tempo de vida da função;
- em `revocation`, marca o bot do canal como desconectado.

> A Twitch exige callback HTTPS na porta 443 — por isso, localmente, use o `pnpm simulate:chat`. Para testar com a Twitch de verdade em dev, exponha o `localhost:3000` com um túnel (ex.: `cloudflared tunnel --url http://localhost:3000`) e coloque a URL em `NEXT_PUBLIC_APP_URL`.

### ⚠️ Projetos gratuitos do Supabase são pausados

Projetos Free são **pausados após ~7 dias sem atividade**. Este app mitiga isso de duas formas: toda visita a `/t/{canal}` consulta o banco (`touch_visit`) e o Vercel Cron chama `/api/keepalive` diariamente. Se mesmo assim o projeto for pausado, reative-o pelo dashboard do Supabase (os dados são preservados).

---

## Funcionalidades

**Páginas públicas `/t/{canal}`** (sidebar fixa, vira menu no mobile, recolhível): Início (tocando agora, a seguir, métricas da live, atalhos), Músicas, Fila, Fila Salva, Lista de aprendizado, Histórico, Comandos de Bot, Conteúdo Premium. Rodapé com login, idioma, tema, status do tempo real ("Atualizações ao vivo" / "Reconectando…") e ajuda.

**Músicas**: busca aproximada (ignora acentos/maiúsculas), colunas configuráveis, ordenação refletida na URL (`?order_by=lastPlayed&order_dir=asc`), filtro por atributo (inclui "Nova" e "Premium"), chips clicáveis, "última tocada" em tempo relativo localizado ("3,8 semanas", "2.1 months", "Nunca"), detalhes + favoritar. O dono adiciona/edita/exclui, importa CSV (`título,artista,tags,nova,premium`, cabeçalho em PT ou EN, `,` ou `;`), cria tags livremente, marca "Nova" (removida automaticamente ao tocar) e "Premium".

**Fila**: tocando agora, lista com posição/solicitante/origem/nota/horário; para dono e moderadores: abrir/fechar, tocar, marcar como tocada/próxima, marcar como tocada, pular (não entra no histórico), remover, arrastar para reordenar, mover para o topo, salvar para depois, limpar. Regras configuráveis: limite por usuário, sem repetidas, cooldown por música, apenas inscritos/VIPs, apenas VIPs, pedidos pelo site, pedidos anônimos.

**Comandos de bot**: 15 comandos padrão (`!pedir`, `!errei`, `!replace`, `!tocando`, `!next`, `!last`, `!today`, `!has`, `!lastPlayed`, `!sd`, `!fav`, `!unfav`, `!sl`, `!fila`, `!comandos`; os que colidiriam com StreamElements/Streamlabs/Nightbot — `!sr`, `!song`, `!wrongsong`, `!queue`, `!commands` — têm nomes em PT) + personalizados. Respostas com templates estilo Handlebars: `{{song}}`, `{{user}}`, `{{position}}`, `{{queue_link}}`, `{{#if x}}…{{else}}…{{/if}}`, `{{#select now_playing 1}}…{{#empty}}…{{/select}}`. Cooldown global por comando. Mensagens internas (erro, ambiguidade) em EN ou PT conforme a configuração do canal.

**Painel `/dashboard`**: onboarding, sessão da live (automática via `stream.online/offline` ou manual), configurações da fila, bot, moderadores (por login da Twitch) e URL do overlay.

### Limitações conhecidas (por design, para caber no plano gratuito)

- **"Apenas inscritos" pelo site**: o site não tem como verificar inscrição sem guardar tokens; nesse modo, só pedidos pelo chat (que trazem os badges) passam.

---

## Estrutura

```
supabase/
  migrations/…_init.sql   schema, RLS, RPCs da fila, bot helpers, realtime
  seed.sql                canal demo (local)
  tests/queue.test.sql    pgTAP
src/
  app/t/[slug]/…          páginas públicas do canal
  app/dashboard           painel do streamer
  app/overlay/[slug]      overlay OBS
  app/api/…               pedidos pelo site, EventSub, OAuth do bot, keepalive
  components/channel-live.tsx   provider de tempo real (Supabase Realtime)
  lib/fuzzy.ts  lib/template.ts  lib/commands.ts  lib/queue.ts  lib/relative-time.ts  lib/csv.ts
  lib/twitch/{signature,helix,bot}.ts
scripts/simulate-chat.ts
tests/unit  tests/e2e
```

Depois de alterar migrations: `pnpm db:reset && pnpm db:types`.
