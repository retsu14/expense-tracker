import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/modules/identity/presentation/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <AppShell
      user={{ displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl }}
    >
      {children}
    </AppShell>
  );
}
