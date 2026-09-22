import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/data";
import { LayoutDashboard, ListChecks, Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-secondary/20">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-extrabold">GameFit · Admin</span>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-muted">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/admin/missions" className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-muted">
              <ListChecks className="h-4 w-4" /> <span className="hidden sm:inline">Missões</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-muted">
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">App</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
