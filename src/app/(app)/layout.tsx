import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/modules/identity/presentation/dal";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { ledgerDeps } from "@/shared/container";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const settings = await getSettings(ledgerDeps(), user.id);
  if (!settings.onboardedAt) redirect("/onboarding");

  return (
    <AppShell
      user={{ displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl }}
    >
      {children}
    </AppShell>
  );
}
