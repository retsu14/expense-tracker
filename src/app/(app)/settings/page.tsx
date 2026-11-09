import { ChevronRight, LogOut, Shapes, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AiSettings } from "@/components/assistant/ai-settings";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { BadgeShelf } from "@/components/settings/badge-shelf";
import { AppLockSettings } from "@/components/settings/app-lock-settings";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { InstallAppRow } from "@/components/pwa/install-prompt";
import { DataSettings } from "@/components/settings/data-settings";
import { MascotSettings } from "@/components/settings/mascot-settings";
import { ProfileForm } from "@/components/settings/profile-form";
import { RecoveryCodesCard } from "@/components/settings/recovery-codes-card";
import { SessionsList } from "@/components/settings/sessions-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { countRecoveryCodes, listSessions } from "@/modules/identity/application/account.use-cases";
import { logoutAction } from "@/modules/identity/presentation/actions";
import { requireUser } from "@/modules/identity/presentation/dal";
import { syncPigProgress } from "@/modules/mascot/application/mascot.use-cases";
import { identityDeps, ledgerDeps, mascotDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const deps = identityDeps();
  const [sessions, remainingCodes, accounts] = await Promise.all([
    listSessions(deps, user.id, user.sessionId),
    countRecoveryCodes(deps, user.id),
    ledgerDeps().ledger.listAccounts(user.id),
  ]);
  const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const pig = await syncPigProgress(mascotDeps(), user.id, balance);

  return (
    <>
      <PageHeader title="Settings" description={`Signed in as @${user.username}`} />
      <div className="grid max-w-2xl grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-5">
            <AvatarUploader name={user.displayName} src={user.avatarUrl} />
            <ProfileForm displayName={user.displayName} pigName={user.pigName} />
          </div>
        </Card>

        <Card className="p-0 md:p-0">
          <nav aria-label="Manage" className="divide-y divide-border">
            {[
              { href: "/settings/categories", label: "Categories & favorites", icon: Shapes },
              { href: "/trash", label: "Trash", icon: Trash2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-14 items-center gap-3 px-4 transition-colors duration-120 hover:bg-surface-2 md:px-5"
              >
                <Icon className="size-5 text-fg-muted" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="size-4 text-fg-muted" aria-hidden />
              </Link>
            ))}
          </nav>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <ThemeSwitcher />
          <div className="mt-5 border-t border-border pt-5">
            <InstallAppRow />
          </div>
        </Card>

        <Card id="badges" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <BadgeShelf
            pigName={user.pigName}
            best={pig.progress.best}
            balance={balance}
            outfit={pig.progress.outfit}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{user.pigName}</CardTitle>
          </CardHeader>
          <MascotSettings />
        </Card>

        <Card id="ai">
          <CardHeader>
            <CardTitle>AI</CardTitle>
          </CardHeader>
          <AiSettings pigName={user.pigName} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-6">
            <ChangePasswordForm />
            <div className="border-t border-border pt-5">
              <RecoveryCodesCard remaining={remainingCodes} username={user.username} />
            </div>
            <div className="border-t border-border pt-5">
              <AppLockSettings userId={user.id} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <SessionsList sessions={sessions} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your data</CardTitle>
          </CardHeader>
          <DataSettings username={user.username} />
        </Card>

        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            <LogOut aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
