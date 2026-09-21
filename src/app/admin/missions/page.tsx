import { createAdminClient } from "@/lib/supabase/server";
import { MissionsAdmin } from "@/components/admin/missions-admin";
import type { Mission } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("missions").select("*").order("sort_order").order("created_at");

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Missões</h1>
      <p className="text-sm text-muted-foreground">Crie, edite e ative/desative missões sem alterar código.</p>
      <div className="mt-5">
        <MissionsAdmin initial={(data as Mission[]) ?? []} />
      </div>
    </div>
  );
}
