import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";

import { HideAmountsToggle } from "./hide-amounts-toggle";
import { NotificationBell } from "./notification-bell";
import { SearchButton } from "./search-button";

import type { ShellUser } from "./app-shell";

import { Wordmark } from "./wordmark";

export function MobileTopBar({ user, unread }: { user: ShellUser; unread: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 pt-safe backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Wordmark />
        <div className="flex items-center gap-1">
          <SearchButton compact />
          <HideAmountsToggle />
          <NotificationBell unread={unread} />
          <Link
            href="/settings"
            aria-label="Profile and settings"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <Avatar name={user.displayName} src={user.avatarUrl} size={34} />
          </Link>
        </div>
      </div>
    </header>
  );
}
