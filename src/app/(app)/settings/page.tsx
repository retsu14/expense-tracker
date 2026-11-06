import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <ThemeSwitcher />
        </Card>
      </div>
    </>
  );
}
