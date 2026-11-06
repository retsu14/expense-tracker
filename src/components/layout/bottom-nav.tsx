"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { isActive, type NavItem, primaryNav } from "./nav-items";

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-caption transition-colors duration-120",
        active ? "text-fg" : "text-fg-muted",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  const [home, activity, plan, insights] = primaryNav;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {home && <Tab item={home} pathname={pathname} />}
        {activity && <Tab item={activity} pathname={pathname} />}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Add transaction"
            onClick={() => {
              setQuickAddOpen(true);
            }}
            className="-mt-6 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-bg transition-transform duration-120 active:scale-[0.94]"
          >
            <Plus className="size-7" aria-hidden />
          </button>
        </div>
        {plan && <Tab item={plan} pathname={pathname} />}
        {insights && <Tab item={insights} pathname={pathname} />}
      </div>
    </nav>
  );
}
