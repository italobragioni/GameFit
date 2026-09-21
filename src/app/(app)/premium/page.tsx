import { redirect } from "next/navigation";
import { getCurrentProfile, getIsPremium } from "@/lib/data";
import { Paywall } from "@/components/game/paywall";
import { PageHeader } from "@/components/game/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PremiumPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const isPremium = await getIsPremium();

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Premium" subtitle="Continue sua jornada" />
      {isPremium ? (
        <Card className="mt-4">
          <CardContent className="pt-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-xl font-extrabold">Você já é Premium 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aproveite todas as missões, desafios e estatísticas. Bora evoluir!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4">
          <Paywall context="premium_page" />
        </div>
      )}
    </div>
  );
}
