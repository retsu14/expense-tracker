import { CircleUserRound } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "./wordmark";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 pt-safe backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Wordmark />
        <Link
          href="/settings"
          aria-label="Profile and settings"
          className="flex size-11 items-center justify-center rounded-full text-fg-muted hover:text-fg"
        >
          <CircleUserRound className="size-7" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
