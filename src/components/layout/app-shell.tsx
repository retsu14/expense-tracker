import type { ReactNode } from "react";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineSync } from "@/components/pwa/offline-sync";

import { BottomNav } from "./bottom-nav";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { MobileTopBar } from "./mobile-top-bar";
import { NavRail } from "./nav-rail";
import { QuickAddModal } from "./quick-add-modal";
import { Sidebar } from "./sidebar";

export type ShellUser = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export function AppShell({
  children,
  user,
  unread,
}: {
  children: ReactNode;
  user: ShellUser;
  unread: number;
}) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar user={user} unread={unread} />
      <NavRail unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineSync userId={user.id} />
        <MobileTopBar user={user} unread={unread} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-10 lg:px-8"
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <QuickAddModal userId={user.id} />
      <InstallPrompt />
      <KeyboardShortcuts />
    </div>
  );
}
