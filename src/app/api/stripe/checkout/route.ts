import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "@/lib/billing";
import { PREMIUM_PRICE_ID } from "@/lib/billing/stripe";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY || !PREMIUM_PRICE_ID) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 500 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const { url } = await getBillingProvider().createCheckout({
      userId: user.id,
      email: user.email ?? "",
      customerId: sub?.customer_id ?? undefined,
      successUrl: `${site}/dashboard?checkout=success`,
      cancelUrl: `${site}/premium?checkout=cancel`,
    });
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erro no checkout." }, { status: 500 });
  }
}
