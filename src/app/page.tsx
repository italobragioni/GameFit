import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PREMIUM_PRICE_LABEL } from "@/lib/game/config";
import { Check, Flame, Star, Trophy, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const STEPS = [
  { n: 1, title: "Complete suas missões", desc: "Pequenas ações diárias de alimentação, movimento, hidratação e sono." },
  { n: 2, title: "Ganhe XP", desc: "Cada hábito concluído te dá pontos e mantém você no ritmo." },
  { n: 3, title: "Acompanhe seu peso", desc: "Registre seu peso e veja sua evolução — só sua, sem comparações." },
  { n: 4, title: "Mantenha sua sequência", desc: "Volte todos os dias e veja seu 🔥 crescer junto com os resultados." },
];

const BENEFITS = [
  "Missões diárias ilimitadas",
  "Acompanhamento de peso com gráfico",
  "Jornada de 30 dias",
  "Estatísticas completas",
  "Medalhas e conquistas",
  "Histórico do seu progresso",
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Logo className="h-12" />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Começar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mx-auto mb-5">🎯 Emagreça com hábitos, não com sofrimento</Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Emagreça criando hábitos que duram.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Um app que transforma sua jornada de emagrecimento em um jogo: pequenas missões diárias,
            acompanhamento do seu peso e a consistência que traz resultado de verdade — sem dietas
            malucas, sem culpa.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full">
                Começar agora <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full">Já tenho conta</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Foco em hábitos saudáveis e consistência. Não fazemos diagnósticos, não prescrevemos
            dietas e os resultados variam de pessoa para pessoa.
          </p>
        </div>

        {/* Mock do app */}
        <div className="mx-auto mt-14 max-w-sm">
          <div className="rounded-[2.5rem] border-8 border-foreground/90 bg-background p-4 shadow-2xl">
            <div className="rounded-3xl bg-secondary/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">Bom dia, Marina 👋</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat icon={<Flame className="mx-auto h-4 w-4 text-orange-500" />} value="7" label="dias" />
                <MiniStat icon={<Star className="mx-auto h-4 w-4 text-amber-500" />} value="1.450" label="XP" />
                <MiniStat icon={<Trophy className="mx-auto h-4 w-4 text-emerald-600" />} value="8" label="nível" />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { i: "⚖️", t: "Registrar seu peso", xp: 20 },
                  { i: "🥗", t: "Refeição equilibrada", xp: 30 },
                  { i: "🚶", t: "30 min de movimento", xp: 30 },
                ].map((m) => (
                  <div key={m.t} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                    <span className="text-xl">{m.i}</span>
                    <span className="flex-1 text-sm font-medium">{m.t}</span>
                    <span className="text-xs font-bold text-success">+{m.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t bg-secondary/30 py-16">
        <div className="container">
          <h2 className="text-center text-3xl font-extrabold">Como o GameFit te ajuda a emagrecer</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <Card key={s.n} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="container py-16">
        <div className="mx-auto max-w-md">
          <Card className="border-primary/30 shadow-lg">
            <CardContent className="pt-8 text-center">
              <Badge variant="premium" className="mx-auto">GameFit Premium</Badge>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold">{PREMIUM_PRICE_LABEL}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="mt-6 space-y-3 text-left">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0 text-success" />
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block">
                <Button size="lg" className="w-full">Começar agora</Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">Cancele quando quiser.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <span className="font-bold text-foreground">GameFit</span>
          <p>Emagrecimento por meio de hábitos saudáveis e gamificação. Este app não substitui orientação profissional de saúde e não garante resultados específicos.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Entrar</Link>
            <Link href="/signup" className="hover:text-foreground">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-card p-2 shadow-sm">
      {icon}
      <div className="mt-1 text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
