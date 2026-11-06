import { LogOut } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
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
import { identityDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const deps = identityDeps();
  const [sessions, remainingCodes] = await Promise.all([
    listSessions(deps, user.id, user.sessionId),
    countRecoveryCodes(deps, user.id),
  ]);

  return (
    <>
      <PageHeader title="Settings" description={`Signed in as @${user.username}`} />
      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <div className="grid gap-5">
            <AvatarUploader name={user.displayName} src={user.avatarUrl} />
            <ProfileForm displayName={user.displayName} pigName={user.pigName} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <ThemeSwitcher />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{user.pigName}</CardTitle>
          </CardHeader>
          <MascotSettings />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <div className="grid gap-6">
            <ChangePasswordForm />
            <div className="border-t border-border pt-5">
              <RecoveryCodesCard remaining={remainingCodes} username={user.username} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <SessionsList sessions={sessions} />
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
