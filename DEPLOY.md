# 🚀 Guia de Deploy — Projeto Leve (Vercel + Supabase + Stripe)

Guia completo para colocar o Projeto Leve no ar **gastando R$0** para construir e validar. Você só terá custo quando começar a vender (taxa do Stripe por venda).

Tempo estimado: ~30 minutos.

---

## Visão geral do custo

| Serviço | Plano | Custo |
|---|---|---|
| Vercel | Hobby | Grátis (Pro ~US$20/mês quando faturar de verdade) |
| Supabase | Free | Grátis (banco 500MB, ~50k usuários/mês) |
| Stripe | — | Sem mensalidade; só % por venda |

---

## Passo 1 — Subir o código para o GitHub

Se ainda não estiver no GitHub, o repositório já está versionado. Garanta que a branch esteja publicada:

```bash
git push -u origin main
```

> Dica: use o modo **Test** do Stripe durante todo o setup. Só troque para as chaves **Live** quando for vender de verdade.

---

## Passo 2 — Criar o projeto no Supabase (grátis)

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Escolha um nome, uma senha forte para o banco e a região mais próxima (ex.: `South America (São Paulo)`).
3. Aguarde o provisionamento (~2 min).

### 2.1 Rodar as migrations e o seed

No painel do Supabase → **SQL Editor** → **New query**. Cole e rode **na ordem** o conteúdo de cada arquivo (um de cada vez, clicando em *Run*):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/seed.sql`

Ao final você já terá 50 missões, a jornada de 30 dias, conquistas e níveis no banco.

### 2.2 Copiar as chaves

No painel → **Project Settings** → **API**. Anote:

- **Project URL** → vira `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → vira `SUPABASE_SERVICE_ROLE_KEY` (⚠️ segredo, só no servidor)

---

## Passo 3 — Configurar o Stripe (sem mensalidade)

1. Crie a conta em [stripe.com](https://stripe.com) e mantenha o toggle em **Test mode** (canto superior direito).
2. **Products** → **Add product**:
   - Nome: `Projeto Leve Premium`
   - Preço: **R$ 19,00**, recorrente **mensal**.
   - Salve e copie o **Price ID** (começa com `price_...`) → vira `STRIPE_PREMIUM_PRICE_ID`.
3. **Developers** → **API keys**: copie a **Secret key** (`sk_test_...`) → vira `STRIPE_SECRET_KEY`, e a **Publishable key** (`pk_test_...`) → vira `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. O **webhook** será configurado no Passo 5 (precisa da URL de produção primeiro).

---

## Passo 4 — Deploy na Vercel (Hobby, grátis)

1. Acesse [vercel.com](https://vercel.com) e faça login com o GitHub.
2. **Add New → Project** → importe o repositório `GameFit`.
3. A Vercel detecta o Next.js automaticamente. **Não faça deploy ainda** — primeiro adicione as variáveis de ambiente.
4. Em **Environment Variables**, adicione (use o `.env.example` como referência):

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | deixe em branco por ora (preenche no 4.1) |
   | `NEXT_PUBLIC_SUPABASE_URL` | do Passo 2.2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | do Passo 2.2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | do Passo 2.2 |
   | `STRIPE_SECRET_KEY` | do Passo 3 |
   | `STRIPE_PREMIUM_PRICE_ID` | do Passo 3 |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | do Passo 3 |
   | `STRIPE_WEBHOOK_SECRET` | deixe em branco por ora (preenche no 5) |
   | `BILLING_PROVIDER` | `stripe` |

5. Clique em **Deploy**. Ao terminar, a Vercel te dá a URL (ex.: `https://gamefit-xxxx.vercel.app`).

### 4.1 Definir a URL do site

- Copie a URL do deploy.
- **Settings → Environment Variables** → edite `NEXT_PUBLIC_SITE_URL` com essa URL (sem barra no final).
- Faça um **Redeploy** (aba Deployments → ⋯ → Redeploy).

---

## Passo 5 — Webhook do Stripe (mantém a assinatura em dia)

1. No Stripe → **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL**: `https://SEU_DOMINIO.vercel.app/api/stripe/webhook`
3. **Select events** — adicione:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Salve e copie o **Signing secret** (`whsec_...`).
5. Na Vercel → adicione/edite `STRIPE_WEBHOOK_SECRET` com esse valor → **Redeploy**.

---

## Passo 6 — Configurar o Auth do Supabase

No Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://SEU_DOMINIO.vercel.app`
- **Redirect URLs**: adicione `https://SEU_DOMINIO.vercel.app/auth/callback`

> Para simplificar os testes iniciais, você pode desativar a confirmação de e-mail em **Authentication → Providers → Email → Confirm email (off)**. Ative novamente antes de lançar de verdade.

---

## Passo 7 — Virar admin e testar

1. Acesse `https://SEU_DOMINIO.vercel.app` e **crie sua conta**.
2. No Supabase → **SQL Editor**, rode:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'seu@email.com');
   ```
3. Acesse `/admin` para ver o painel e gerenciar missões.
4. Teste o fluxo completo: onboarding → concluir missões → ganhar XP → assinar Premium.
   - **Cartão de teste do Stripe:** `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.

---

## Checklist final antes de vender de verdade

- [ ] Trocar as chaves do Stripe de **Test** para **Live** (e recriar o webhook no modo Live).
- [ ] Reativar a confirmação de e-mail no Supabase.
- [ ] Migrar o plano da Vercel para **Pro** (uso comercial) quando começar a faturar.
- [ ] Revisar textos de **Termos** e **Privacidade** (`/terms`, `/privacy`).
- [ ] Conferir se `NEXT_PUBLIC_SITE_URL` aponta para o domínio final.

---

## Domínio próprio (opcional, ~R$40/ano)

Não é obrigatório — a URL `.vercel.app` funciona de graça. Se quiser um domínio próprio depois: Vercel → **Settings → Domains → Add**, e lembre de atualizar `NEXT_PUBLIC_SITE_URL`, a Site URL do Supabase e a URL do webhook do Stripe.

---

## Problemas comuns

- **"Após login volto pro login"**: o trigger `handle_new_user` não rodou → confirme que a migration `0002_functions.sql` foi aplicada.
- **Checkout não abre**: `STRIPE_SECRET_KEY` ou `STRIPE_PREMIUM_PRICE_ID` faltando/errado nas env vars da Vercel.
- **Assinatura não vira Premium**: o webhook não está recebendo eventos → confira a URL e o `STRIPE_WEBHOOK_SECRET`.
- **Erro de e-mail de confirmação**: a Redirect URL do Supabase precisa bater com `NEXT_PUBLIC_SITE_URL` + `/auth/callback`.
