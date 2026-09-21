import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingProvider } from "@/lib/billing";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.customer_id) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const { url } = await getBillingProvider().createPortal(sub.customer_id, `${site}/profile`);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erro no portal." }, { status: 500 });
  }
}
