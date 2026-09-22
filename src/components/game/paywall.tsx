"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket } from "lucide-react";
import { PREMIUM_PRICE_LABEL } from "@/lib/game/config";
import { track } from "@/lib/analytics";

const BENEFITS = [
  "Missões ilimitadas",
  "Acompanhamento de peso",
  "Jornada de 30 dias",
  "Estatísticas completas",
  "Medalhas",
  "Histórico completo",
];

export function Paywall({ context }: { context?: string }) {
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    track("paywall_viewed", { context: context ?? "unknown" });
  }, [context]);

  async function startCheckout() {
    setLoading(true);
    await track("checkout_started", { context: context ?? "unknown" });
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        alert(data.error ?? "Não foi possível iniciar o checkout.");
        setLoading(false);
      }
    } catch {
      alert("Não foi possível iniciar o checkout.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold">Continue sua jornada 🚀</h2>
        <p className="mt-1 text-sm text-muted-foreground">Desbloqueie tudo do GameFit.</p>

        <div className="mt-4 flex items-baseline justify-center gap-1">
          <Badge variant="premium">Premium</Badge>
          <span className="ml-1 text-3xl font-extrabold">{PREMIUM_PRICE_LABEL}</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>

        <ul className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-2 text-left">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-success" />
              {b}
            </li>
          ))}
        </ul>

        <Button className="mt-6 w-full" size="lg" onClick={startCheckout} disabled={loading}>
          {loading ? "Redirecionando..." : "Quero continuar"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Cancele quando quiser.</p>
      </CardContent>
    </Card>
  );
}
