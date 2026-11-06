"use client";

import { CalendarClock, CheckCheck, PartyPopper, Repeat, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notification } from "@/modules/planning/domain/ports";
import { markNotificationsReadAction } from "@/modules/planning/presentation/actions";

const ICON = { budget: Target, bill: CalendarClock, goal: PartyPopper, recurring: Repeat } as const;

export function NotificationList({ items }: { items: Notification[] }) {
  const marked = useRef(false);
  const hasUnread = items.some((n) => !n.readAt);

  useEffect(() => {
    if (!hasUnread || marked.current) return;
    marked.current = true;
    void markNotificationsReadAction();
  }, [hasUnread]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        description="Budget alerts, bill reminders and goal wins will show up here."
      />
    );
  }

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void markNotificationsReadAction();
            }}
          >
            <CheckCheck aria-hidden />
            Mark all read
          </Button>
        </div>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((n) => {
          const Icon = ICON[n.type];
          const body = (
            <>
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  n.type === "budget" && "bg-warning/15 text-warning",
                  n.type === "bill" && "bg-expense/15 text-expense",
                  n.type === "goal" && "bg-pig/20 text-pig",
                  n.type === "recurring" && "bg-income/15 text-income",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{n.title}</span>
                <span className="block text-body-sm text-fg-muted">{n.body}</span>
                <span className="mt-0.5 block text-caption font-normal text-fg-muted">
                  {relativeTime(new Date(n.createdAt))}
                </span>
              </span>
              {!n.readAt && (
                <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
              )}
            </>
          );
          return (
            <li key={n.id}>
              {n.href ? (
                <Link
                  href={n.href}
                  className="flex items-start gap-3 px-4 py-3 transition-colors duration-120 hover:bg-surface-2"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
