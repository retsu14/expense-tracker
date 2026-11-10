import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireUser } from "@/modules/identity/presentation/dal";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { ledgerDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const user = await requireUser();
  const settings = await getSettings(ledgerDeps(), user.id);
  if (settings.onboardedAt) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-8 pt-safe pb-safe md:justify-center">
      <div className="w-full max-w-md">
        <OnboardingWizard
          name={user.displayName.split(" ")[0] ?? user.displayName}
          pigName={user.pigName}
        />
      </div>
    </main>
  );
}
