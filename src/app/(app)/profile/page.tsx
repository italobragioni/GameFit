import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getStreak, getIsPremium, getLevelThresholds } from "@/lib/data";
import { ProfileSettings } from "@/components/game/profile-settings";
import { Badge } from "@/components/ui/badge";
import { getLevelInfo } from "@/lib/game/levels";
import { formatXP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const isPremium = await getIsPremium();
  const [streak, thresholds, { data: notifications }] = await Promise.all([
    getStreak(profile.id),
    getLevelThresholds(),
    supabase.from("notification_preferences").select("*").eq("user_id", profile.id).maybeSingle(),
  ]);

  const level = getLevelInfo(profile.total_xp, thresholds);
  const initials = (profile.full_name ?? "?").slice(0, 2).toUpperCase();
  const joined = new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="px-4 pt-6">
      {/* Cabeçalho do perfil */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
          {initials}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{profile.full_name ?? "Usuário"}</h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge>Nível {level.level} · {level.title}</Badge>
          {isPremium ? <Badge variant="premium">Premium</Badge> : <Badge variant="muted">Grátis</Badge>}
        </div>
        <div className="mt-4 grid w-full grid-cols-3 gap-3">
          <MiniStat value={formatXP(profile.total_xp)} label="XP" />
          <MiniStat value={String(streak?.current_streak ?? 0)} label="sequência" />
          <MiniStat value={joined} label="desde" small />
        </div>
      </div>

      <div className="mt-6">
        <ProfileSettings fullName={profile.full_name ?? ""} isPremium={isPremium} notifications={notifications} />
      </div>
    </div>
  );
}

function MiniStat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
      <p className={small ? "text-sm font-bold capitalize" : "text-lg font-extrabold"}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
