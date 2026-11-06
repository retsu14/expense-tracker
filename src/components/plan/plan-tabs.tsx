"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/plan", label: "Budgets" },
  { href: "/plan/bills", label: "Bills" },
  { href: "/plan/goals", label: "Goals" },
  { href: "/plan/debts", label: "Debts" },
];

export function PlanTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Plan sections"
      className="mb-6 grid grid-cols-4 gap-1 rounded-md border border-border bg-bg p-1 sm:inline-grid sm:w-[28rem]"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center rounded-sm px-1 text-body-sm font-semibold transition-colors duration-120",
              active ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
