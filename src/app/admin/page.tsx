import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatXP } from "@/lib/utils";
import { PREMIUM_PRICE_MONTHLY } from "@/lib/game/config";

export const dynamic = "force-dynamic";

/** Métricas agregadas — usa service role (server-only) após o guard de admin no layout. */
export default async function AdminDashboard() {
  const admin = createAdminClient();

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Str = since30.toISOString();

  const [
    totalUsers,
    newUsers,
    activeSubs,
    canceledSubs,
    completedMissions,
    checkins,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30Str),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "canceled"),
    admin.from("user_missions").select("id", { count: "exact", head: true }),
    admin.from("daily_checkins").select("id", { count: "exact", head: true }).gte("created_at", since30Str),
  ]);

  const premiumCount = activeSubs.count ?? 0;
  const mrr = premiumCount * PREMIUM_PRICE_MONTHLY;

  const metrics = [
    { label: "Usuários totais", value: String(totalUsers.count ?? 0) },
    { label: "Novos (30 dias)", value: String(newUsers.count ?? 0) },
    { label: "Assinaturas ativas", value: String(premiumCount) },
    { label: "Usuários premium", value: String(premiumCount) },
    { label: "MRR", value: `R$ ${formatXP(mrr)}` },
    { label: "Cancelamentos", value: String(canceledSubs.count ?? 0) },
    { label: "Missões concluídas", value: String(completedMissions.count ?? 0) },
    { label: "Check-ins (30d)", value: String(checkins.count ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Visão geral</h1>
      <p className="text-sm text-muted-foreground">Métricas do produto em tempo real.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
