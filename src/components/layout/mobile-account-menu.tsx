"use client";

import {
  ChevronRight,
  LogOut,
  MessageCircleHeart,
  Settings,
  Shapes,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { logoutAction } from "@/modules/identity/presentation/actions";

import type { ShellUser } from "./app-shell";

const LINKS = [
  { href: "/accounts", label: "Accounts & wallets", icon: Wallet },
  { href: "/assistant", label: "Ask Oink", icon: MessageCircleHeart },
  { href: "/settings/categories", label: "Categories & favorites", icon: Shapes },
  { href: "/import", label: "Import CSV", icon: Upload },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileAccountMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
        }}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size={34} />
      </button>
      <ResponsiveModal open={open} onOpenChange={setOpen} title="Account">
        <div className="grid gap-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 transition-colors duration-120 hover:bg-surface-2/70"
          >
            <Avatar name={user.displayName} src={user.avatarUrl} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{user.displayName}</span>
              <span className="block truncate text-caption font-normal text-fg-muted">
                @{user.username}
              </span>
            </span>
            <ChevronRight className="size-4 text-fg-muted" aria-hidden />
          </Link>
          <nav aria-label="Account" className="-mx-1 grid">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 font-medium transition-colors duration-120 hover:bg-surface-2 aria-[current=page]:bg-surface-2"
              >
                <Icon className="size-5 text-fg-muted" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-fg-muted" aria-hidden />
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="border-t border-border pt-3">
            <button
              type="submit"
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-medium text-expense transition-colors duration-120 hover:bg-surface-2"
            >
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </ResponsiveModal>
    </>
  );
}
