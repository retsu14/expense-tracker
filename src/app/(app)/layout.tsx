import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/modules/identity/presentation/dal";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { maybeSyncPlanning } from "@/modules/planning/presentation/sync";
import { unreadNotifications } from "@/modules/planning/application/planning.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const settings = await getSettings(ledgerDeps(), user.id);
  if (!settings.onboardedAt) redirect("/onboarding");
  await maybeSyncPlanning(user.id);
  const unread = await unreadNotifications(planningDeps(), user.id);

  return (
    <AppShell
      user={{ displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl }}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
