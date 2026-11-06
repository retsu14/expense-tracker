"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PigMark } from "@/components/pig/pig-mark";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { isActive, primaryNav, secondaryNav } from "./nav-items";
import { NotificationBell } from "./notification-bell";

export function NavRail({ unread }: { unread: number }) {
  const pathname = usePathname();
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);

  return (
    <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center border-r border-border bg-surface py-4 md:flex lg:hidden">
      <Link href="/" aria-label="Oink home" className="rounded-md p-1">
        <PigMark className="size-9" />
      </Link>
      <NotificationBell unread={unread} className="mt-2" />
      <button
        type="button"
        aria-label="Add transaction"
        onClick={() => {
          setQuickAddOpen(true);
        }}
        className="mt-4 flex size-12 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-fg transition-transform duration-120 active:scale-[0.97]"
      >
        <Plus className="size-6" aria-hidden />
      </button>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-2">
        {[...primaryNav, ...secondaryNav].map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-16 flex-col items-center gap-1 rounded-md py-2 text-caption transition-colors duration-120",
                active ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
