import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, mapStripeStatus } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Stripe. Mantém a tabela subscriptions sincronizada com o
 * ciclo de vida: criação, renovação, inadimplência e cancelamento.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Assinatura inválida: ${err.message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  async function upsertFromSubscription(sub: Stripe.Subscription, userIdHint?: string) {
    const userId = userIdHint ?? (sub.metadata?.user_id as string | undefined);
    const priceId = sub.items.data[0]?.price.id ?? null;
    const payload = {
      provider: "stripe",
      customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscription_id: sub.id,
      price_id: priceId,
      status: mapStripeStatus(sub.status),
      cancel_at_period_end: sub.cancel_at_period_end,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    };

    if (userId) {
      await admin.from("subscriptions").upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    } else {
      // Sem user_id no metadata: casa pelo subscription_id existente.
      await admin.from("subscriptions").update(payload).eq("subscription_id", sub.id);
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.client_reference_id || session.metadata?.user_id) as string | undefined;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertFromSubscription(sub, userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("subscription_id", invoice.subscription as string);
        }
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erro no processamento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
