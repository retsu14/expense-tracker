"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import type { ShellUser } from "./app-shell";
import { HideAmountsToggle } from "./hide-amounts-toggle";
import { NotificationBell } from "./notification-bell";
import { SearchButton } from "./search-button";
import { isActive, type NavItem, primaryNav, secondaryNav } from "./nav-items";
import { Wordmark } from "./wordmark";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-md px-3 text-body-sm font-medium transition-colors duration-120",
        active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {item.label}
    </Link>
  );
}

export function Sidebar({ user, unread }: { user: ShellUser; unread: number }) {
  const pathname = usePathname();
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center justify-between">
        <Wordmark className="px-2" />
        <div className="flex">
          <HideAmountsToggle />
          <NotificationBell unread={unread} />
        </div>
      </div>
      <SearchButton className="mt-4" />
      <Button
        className="mt-3 w-full"
        onClick={() => {
          setQuickAddOpen(true);
        }}
      >
        <Plus aria-hidden />
        Add transaction
      </Button>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
        {primaryNav.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <nav aria-label="Account" className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {secondaryNav
          .filter((item) => item.href !== "/settings")
          .map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        <Link
          href="/settings"
          className="mt-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-120 hover:bg-surface-2/60"
        >
          <Avatar name={user.displayName} src={user.avatarUrl} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-body-sm font-semibold">{user.displayName}</span>
            <span className="block truncate text-caption font-normal text-fg-muted">
              @{user.username}
            </span>
          </span>
        </Link>
      </nav>
    </aside>
  );
}
