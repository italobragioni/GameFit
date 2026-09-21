/**
 * Camada de cobrança modular.
 * Hoje implementa Stripe; a interface permite plugar Mercado Pago depois
 * sem alterar as rotas/telas que consomem estas funções.
 */
import { getStripe, PREMIUM_PRICE_ID } from "./stripe";

export interface CheckoutParams {
  userId: string;
  email: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  name: string;
  createCheckout(params: CheckoutParams): Promise<{ url: string }>;
  createPortal(customerId: string, returnUrl: string): Promise<{ url: string }>;
}

const stripeProvider: BillingProvider = {
  name: "stripe",
  async createCheckout({ userId, email, customerId, successUrl, cancelUrl }) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : email,
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: userId } },
      metadata: { user_id: userId },
    });
    if (!session.url) throw new Error("Stripe não retornou URL de checkout.");
    return { url: session.url };
  },
  async createPortal(customerId, returnUrl) {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  },
};

export function getBillingProvider(): BillingProvider {
  const provider = process.env.BILLING_PROVIDER ?? "stripe";
  switch (provider) {
    case "stripe":
      return stripeProvider;
    // case "mercadopago": return mercadoPagoProvider;
    default:
      return stripeProvider;
  }
}
