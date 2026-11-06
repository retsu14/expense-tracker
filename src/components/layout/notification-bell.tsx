import { Bell } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function NotificationBell({ unread, className }: { unread: number; className?: string }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-120 hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-expense px-1 text-[10px] leading-4.5 font-bold text-bg">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
