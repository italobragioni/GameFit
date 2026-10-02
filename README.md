# 🎬 Editor de Vídeos

Aplicativo web **mobile-first** para **edição automática de vídeos em fila**.
Você adiciona vários vídeos (ou links), escolhe um template e o app processa
**um de cada vez** no servidor — mesmo com o celular bloqueado — e salva tudo
no seu **Google Drive**.

- ✅ Funciona no **Safari (iPhone)** e no **Chrome (Android)**
- ✅ Pode ser **instalado na tela inicial** (PWA)
- ✅ Botões grandes, interface simples e acessível
- ✅ Processamento **no servidor** (você pode fechar o app)
- ✅ Pensado para custar **o mais próximo possível de R$ 0/mês**

> ⚖️ **Uso responsável.** Esta é uma ferramenta de edição e automação. Ela
> **não** contém recursos para burlar DRM, autenticação ou proteções de
> plataformas. Use apenas com vídeos que você tem o direito de editar e links
> de fontes das quais você tem permissão para baixar.

---

## 📐 Arquitetura (a mais simples possível)

```
   📱 Celular (PWA / navegador)
        │  cria lote, envia vídeos ou links
        ▼
   ▲ Frontend + API  (Next.js na Vercel)  ──►  🗄️  Supabase
        │                                        - Banco de dados (Postgres)
        │                                        - Login (Auth)
        │                                        - Storage (uploads temporários)
        │                                        - FILA (tabela "videos")
        ▼
   ⚙️  Worker (Node + FFmpeg)  ◄── lê a fila (1 vídeo por vez)
        │  baixa → processa → envia ao Drive → confirma → apaga temporários → próximo
        ▼
   ☁️  Google Drive  (seus vídeos editados)
```

**Por que assim?**
- A Vercel **não** aguenta renderização pesada de FFmpeg em funções
  serverless, então o processamento fica em um **worker separado**.
- A **fila é o próprio banco Postgres** do Supabase (sem Redis, sem BullMQ) —
  mais simples e mais barato. O worker pega **um vídeo por vez** com segurança
  (`FOR UPDATE SKIP LOCKED`).

---

## 💰 Custos (tudo em plano gratuito)

| Serviço | Para quê | Plano | Custo |
|---|---|---|---|
| **Supabase** | Banco, login, storage, fila | Free | R$ 0 |
| **Vercel** | Hospeda o frontend/API | Hobby | R$ 0 |
| **Google Drive API** | Salvar os vídeos | Gratuito | R$ 0 |
| **Worker** | Processa com FFmpeg | Ver abaixo | R$ 0 a baixo |
| **FFmpeg** | Edição dos vídeos | `ffmpeg-static` (embutido) | R$ 0 |

O **worker** é a única peça que precisa ficar “ligada”. Opções grátis/baratas:
- **Seu próprio computador** em casa (R$ 0) — ótimo para começar.
- **Fly.io / Render / Railway** — têm camadas gratuitas ou de baixo custo
  (usam o `Dockerfile` incluído).

> ⚠️ Pontos que **poderiam** gerar custo se você crescer muito: espaço no
> Supabase Storage/Drive e horas de máquina do worker. No início, os planos
> gratuitos são suficientes.

---

## ✅ O que você vai precisar (contas gratuitas)

1. Uma conta no **GitHub** (para publicar na Vercel) — opcional, mas recomendado.
2. Uma conta no **Supabase** → https://supabase.com
3. Uma conta no **Google Cloud** → https://console.cloud.google.com
4. Uma conta na **Vercel** → https://vercel.com
5. **Node.js 18+** instalado no computador (para configurar e rodar).

---

## 🧰 Instalação passo a passo (bem detalhado)

> Você vai digitar alguns comandos no **Terminal** (Mac/Linux) ou no
> **PowerShell/Prompt** (Windows). Copie e cole com calma.

### 1) Instalar o Node.js
Baixe em https://nodejs.org (versão **LTS**). Depois confirme:
```bash
node -v   # deve mostrar v18 ou maior
```

### 2) Baixar o projeto e instalar as dependências
```bash
# dentro da pasta do projeto:
npm install
```

### 3) Criar o projeto no Supabase
1. Acesse https://supabase.com e crie um projeto (região mais próxima).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Abra o arquivo **`supabase/setup.sql`** deste projeto, **copie tudo** e cole
   no editor. Clique em **Run**. Isso cria as tabelas, as regras de segurança,
   a fila e os buckets de arquivos.
4. Em **Project Settings → API**, anote:
   - **Project URL** → vira `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secreta!) → vira `SUPABASE_SERVICE_ROLE_KEY`
5. (Opcional) Em **Authentication → Providers**, deixe **Email** ativado
   (já vem). Para login com Google, veja o passo 9.

### 4) Criar o projeto no Google Cloud e ativar o Drive
1. Acesse https://console.cloud.google.com e crie um **projeto**.
2. Vá em **APIs e serviços → Biblioteca**, procure **Google Drive API** e
   clique em **Ativar**.

### 5) Configurar a tela de consentimento OAuth
1. **APIs e serviços → Tela de consentimento OAuth**.
2. Tipo de usuário: **Externo** → Criar.
3. Preencha nome do app, e-mail de suporte e e-mail do desenvolvedor.
4. Em **Escopos**, pode deixar vazio (o app pede os escopos na hora).
5. Em **Usuários de teste**, adicione **o seu próprio e-mail do Google**
   (enquanto o app estiver em modo de teste, só esses e-mails conseguem conectar).

### 6) Criar as credenciais OAuth (Client ID/Secret)
1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo: **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, adicione os dois:
   - `http://localhost:3000/api/drive/callback` (para testar no PC)
   - `https://SEU-APP.vercel.app/api/drive/callback` (troque pelo seu domínio depois)
4. Salve e copie:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client secret** → `GOOGLE_CLIENT_SECRET`

### 7) Gerar a chave de criptografia dos tokens
Os tokens do Google Drive são guardados **criptografados**. Gere a chave:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copie o resultado → `TOKEN_ENCRYPTION_KEY`.

### 8) Preencher as variáveis de ambiente
Copie o arquivo de exemplo e preencha com os valores que você anotou:

```bash
# para rodar no computador:
cp .env.example apps/web/.env.local     # usado pelo frontend/API
cp .env.example apps/worker/.env        # usado pelo worker
```

Abra cada arquivo e preencha. O **worker** precisa de **todas** as variáveis;
o **frontend** precisa das que começam com `NEXT_PUBLIC_` + as do Google +
`SUPABASE_SERVICE_ROLE_KEY` + `TOKEN_ENCRYPTION_KEY`. Veja a tabela no final.

> 🔐 Nunca envie os arquivos `.env`/`.env.local` para o GitHub. Eles já estão
> no `.gitignore`.

### 9) (Opcional) Login com Google no app
Isso é **diferente** do Drive. Se quiser o botão “Entrar com Google”:
1. No Supabase: **Authentication → Providers → Google** → ative.
2. Use um **Client ID/Secret** do Google (pode ser o mesmo projeto) com o
   redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Sem isso, o **login por e-mail** (link mágico) já funciona sozinho.

### 10) Sobre o FFmpeg
Você **não precisa instalar nada**: o worker usa o `ffmpeg-static` (um FFmpeg
embutido) automaticamente. Se preferir usar o FFmpeg do seu sistema, instale-o
e aponte `FFMPEG_PATH` para ele (ex.: `/usr/bin/ffmpeg`).

---

## ▶️ Rodar localmente

Abra **dois terminais** na pasta do projeto:

```bash
# Terminal 1 — frontend/API (http://localhost:3000)
npm run dev:web

# Terminal 2 — worker (processa a fila)
npm run dev:worker
```

Acesse **http://localhost:3000**, faça login, conecte o Google Drive em
**Configurações**, crie um **template**, crie um **lote** e inicie. O worker
vai processar e enviar ao Drive.

---

## 🧪 Testar

```bash
npm test
```
Isso roda os testes do pacote compartilhado (comando do FFmpeg, nomes de
arquivo, validações) e do worker (fila/retentativas e **renders reais de
FFmpeg** com vídeos horizontais, verticais e quadrados).

---

## 🚀 Publicar

### Frontend na Vercel
1. Suba o projeto para o GitHub e importe o repositório na Vercel.
2. Em **Settings → General → Root Directory**, escolha **`apps/web`**
   (deixe marcado “Include files outside root directory”).
3. Em **Settings → Environment Variables**, adicione as variáveis do frontend
   (veja a tabela). Em `NEXT_PUBLIC_APP_URL` e `GOOGLE_REDIRECT_URI` use o
   domínio final da Vercel.
4. Deploy. Depois, **volte ao Google Cloud** (passo 6) e confirme que o
   redirect `https://SEU-APP.vercel.app/api/drive/callback` está cadastrado.

### Worker (escolha uma)
O worker roda a partir do `Dockerfile` em `apps/worker/Dockerfile`
(contexto = raiz do repositório).

- **No seu computador** (mais fácil para começar):
  ```bash
  npm run build:shared && npm run build --workspace=@editor/worker
  node apps/worker/dist/index.js
  ```
- **Com Docker (Fly.io / Render / Railway / VPS):**
  ```bash
  docker build -f apps/worker/Dockerfile -t editor-worker .
  docker run --env-file apps/worker/.env editor-worker
  ```
  Em qualquer um desses serviços, configure as **mesmas variáveis de ambiente**
  do `.env` do worker. No worker, `GOOGLE_REDIRECT_URI` deve ser **igual** ao
  usado no frontend.

---

## 📲 Adicionar à tela inicial do celular (PWA)

**iPhone (Safari):** abra o site → botão **Compartilhar** → **Adicionar à Tela
de Início**.

**Android (Chrome):** abra o site → menu **⋮** → **Instalar aplicativo** /
**Adicionar à tela inicial**.

Depois é só abrir pelo ícone, como um aplicativo. O processamento continua no
servidor mesmo com o app fechado.

---

## 🗂️ Estrutura do projeto

```
editor-de-videos/
├── apps/
│   ├── web/            # Next.js (frontend + API) — vai para a Vercel
│   └── worker/         # Node + FFmpeg — processa a fila
├── packages/
│   └── shared/         # tipos + construtor do comando FFmpeg (com testes)
├── supabase/
│   ├── migrations/     # SQL por etapa
│   └── setup.sql       # SQL completo (cole no Supabase)
├── .env.example
└── README.md
```

---

## 🔑 Variáveis de ambiente

| Variável | Onde usar | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web + worker | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Chave pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | web + worker | Chave secreta (backend) |
| `SUPABASE_STORAGE_BUCKET` | web + worker | Bucket de uploads (`uploads`) |
| `GOOGLE_CLIENT_ID` | web + worker | OAuth do Drive |
| `GOOGLE_CLIENT_SECRET` | web + worker | OAuth do Drive (secreto) |
| `GOOGLE_REDIRECT_URI` | web + worker | Deve bater com o Google Cloud |
| `TOKEN_ENCRYPTION_KEY` | web + worker | Criptografa os tokens (32 bytes base64) |
| `NEXT_PUBLIC_APP_URL` | web | URL pública do site |
| `FFMPEG_PATH` | worker | (opcional) FFmpeg do sistema |
| `WORKER_TMP_DIR` | worker | Pasta temporária |
| `WORKER_POLL_INTERVAL_MS` | worker | Intervalo de checagem da fila |
| `WORKER_MAX_ATTEMPTS` | worker | Tentativas por vídeo (padrão 3) |
| `WORKER_RETRY_BACKOFF_MS` | worker | Espera entre tentativas |
| `WORKER_CLEANUP_AGE_HOURS` | worker | Idade p/ apagar temporários abandonados |

---

## 🔁 Como o processamento funciona (resumo)

Para cada vídeo da fila, **um de cada vez**:
`Baixando → Processando (FFmpeg) → Enviando ao Drive → Confirmado → apaga
temporários → próximo`. O arquivo **só** é apagado **depois** que o Drive
confirma o upload. Se der erro, o app tenta de novo (até 3 vezes); se ainda
falhar, marca ❌ e segue para o próximo — **o lote não trava**. Vídeos que
falharam têm o botão **“Tentar novamente”**.

A edição aplica: encaixe na área do template (**Preencher**/**Conter**),
**espelhamento**, **velocidade** (com áudio sincronizado), **filtro** discreto,
e exporta em **MP4 / H.264 / AAC / 1080×1920 (9:16)** — pronto para Reels,
TikTok e Shorts.

---

## 🧩 Limitações do MVP e próximos passos
- **Notificações push** do PWA: a estrutura já existe (service worker trata
  `push`), mas o envio ainda não está ligado. É o próximo passo natural.
- Uploads muito grandes pelo celular podem esbarrar no limite do Supabase
  Storage no plano gratuito — nesses casos, use **links (URLs)**.
- Novos “importadores” de fontes autorizadas podem ser adicionados de forma
  modular (ver `packages/shared/src/validation.ts`).

---

## 🆘 Problemas comuns
- **“Conecte o Google Drive…”** ao iniciar um lote → vá em **Configurações**,
  conecte o Drive e escolha/crie a pasta de destino.
- **Drive conectou mas não processa** → confira se o **worker** está rodando e
  com as mesmas variáveis de ambiente.
- **“Conexão incompleta” no Drive** → remova o acesso do app na sua Conta
  Google (myaccount.google.com → Segurança → Acesso de terceiros) e conecte de
  novo (isso força o Google a devolver o *refresh token*).
- **Vídeo falhou** → toque em **Ver detalhes** para o motivo técnico e use
  **Tentar novamente**.
