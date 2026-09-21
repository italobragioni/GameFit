import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { BottomNav } from "@/components/game/bottom-nav";
import { FeedbackProvider } from "@/components/game/feedback-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarding_completed) redirect("/onboarding");

  return (
    <FeedbackProvider>
      <div className="mx-auto min-h-dvh max-w-md pb-24">{children}</div>
      <BottomNav />
    </FeedbackProvider>
  );
}
