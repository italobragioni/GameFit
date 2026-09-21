# Projeto Leve 🌱

Micro SaaS mobile-first que transforma hábitos saudáveis em um jogo — missões diárias, XP, níveis, sequências (streaks), medalhas e uma jornada de 30 dias. Inspirado na lógica de gamificação do Duolingo.

> **Importante:** o app foca em bem-estar e consistência. **Não** faz diagnósticos médicos, não prescreve dietas individualizadas e não promete perda de peso.

## Stack

- **Next.js 14** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** + componentes estilo **shadcn/ui**
- **Supabase** — PostgreSQL, Auth e Row Level Security
- **Stripe** — assinatura Premium (R$19/mês), camada de cobrança modular (pronta para Mercado Pago)
- **Recharts** — gráficos de progresso
- Deploy na **Vercel**

## Arquitetura

- **Toda a lógica de jogo roda no banco** (funções PL/pgSQL `SECURITY DEFINER`): `complete_mission`, `complete_challenge_day`, cálculo de nível, streak e conquistas. Isso impede que o client trapaceie XP ou conclua a mesma missão duas vezes no dia (idempotência via `unique (user_id, mission_id, day)`).
- **RLS em todas as tabelas** — um usuário nunca acessa dados de outro. Admin tem leitura ampliada via `is_admin()`. Colunas sensíveis (`total_xp`, `level`, `is_admin`) são protegidas por trigger contra edição direta pelo client.
- **Server Components** para leitura + **Server Actions** para mutações do usuário + **RPC** para ações de jogo (feedback instantâneo).
- **Webhook do Stripe** mantém `subscriptions` em sincronia (criação, renovação, `past_due`, cancelamento, trial).
- **Analytics** desacoplado (`src/lib/analytics.ts`) — grava eventos em `analytics_events` e está pronto para plugar PostHog.

```
src/
  app/
    (auth)/            login, signup
    (app)/             dashboard, challenges, achievements, progress, profile, weight, checkin, premium
    admin/             painel administrativo (métricas + CRUD de missões)
    api/stripe/        checkout, portal, webhook
    auth/callback/     troca de code por sessão
    onboarding/        wizard de 5 telas
  components/ui/       primitivos (button, card, input, ...)
  components/game/     componentes de gamificação (missões, XP, streak, feedback)
  lib/                 supabase, billing, game (níveis/config), data, actions, analytics
supabase/
  migrations/          0001 schema · 0002 funções/RPCs · 0003 RLS
  seed.sql             50 missões, 30 dias de jornada, 10 conquistas, níveis
```

## Como rodar localmente

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Crie um projeto no [Supabase](https://supabase.com)** e rode as migrations + seed. No SQL Editor do Supabase, execute em ordem:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/seed.sql`

   Ou, com a [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase db push        # aplica as migrations
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

3. **Configure as variáveis** — copie `.env.example` para `.env.local` e preencha:
   ```bash
   cp .env.example .env.local
   ```

4. **Stripe**
   - Crie um produto "Premium" com preço recorrente de R$19/mês e copie o `price_id` para `STRIPE_PREMIUM_PRICE_ID`.
   - Webhook local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` e copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`.
   - Eventos ouvidos: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.

5. **Rode**
   ```bash
   npm run dev
   ```
   Abra http://localhost:3000

### Tornar um usuário admin

Depois de criar sua conta no app, rode no SQL Editor:
```sql
update public.profiles set is_admin = true where id = (
  select id from auth.users where email = 'seu@email.com'
);
```
Acesse `/admin`.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as mesmas variáveis de ambiente (`.env.example`).
3. Ajuste `NEXT_PUBLIC_SITE_URL` para a URL de produção.
4. Configure o webhook do Stripe apontando para `https://SEU_DOMINIO/api/stripe/webhook`.
5. No Supabase Auth, adicione a URL de produção em **Redirect URLs** (`/auth/callback`).

## Fluxo principal

Abrir app → ver missão → concluir → ganhar XP (animação) → próxima missão. Check-in diário em menos de 1 minuto. 3 missões concluídas = dia válido para a sequência 🔥.

## Modelo de dados (resumo)

`profiles`, `subscriptions`, `missions`, `user_missions`, `xp_transactions`, `streaks`, `daily_checkins`, `achievements`, `user_achievements`, `challenges`, `challenge_days`, `challenge_missions`, `user_challenges`, `user_challenge_progress`, `weight_entries`, `notification_preferences`, `level_thresholds`, `analytics_events`.

## Roadmap preparado (não bloqueia o MVP)

- Push / e-mail / WhatsApp (tabela `notification_preferences` + mensagens de retenção)
- PostHog (interface de analytics já isolada)
- Mercado Pago (interface `BillingProvider` já modular)
- Período de teste (campo `trial_end` já no schema)
