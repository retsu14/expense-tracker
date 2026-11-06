"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { describeDevice, relativeTime } from "@/lib/format";
import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/modules/identity/presentation/actions";

export type SessionView = {
  id: string;
  userAgent: string | null;
  lastSeenAt: Date;
  current: boolean;
};

export function SessionsList({ sessions }: { sessions: SessionView[] }) {
  const [pending, startTransition] = useTransition();
  const others = sessions.filter((s) => !s.current).length;

  const run = (fn: () => Promise<{ ok: boolean }>, success: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error("Couldn't sign out that device.");
    });
  };

  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border">
        {sessions.map((s) => {
          const mobile = /iPhone|Android|iPad/.test(s.userAgent ?? "");
          const Icon = mobile ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0">
              <Icon className="size-5 shrink-0 text-fg-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium">
                  {describeDevice(s.userAgent)}
                  {s.current && (
                    <span className="ml-2 rounded-full bg-income/15 px-2 py-0.5 text-caption text-income">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-caption font-normal text-fg-muted">
                  Active {relativeTime(new Date(s.lastSeenAt))}
                </p>
              </div>
              {!s.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    run(() => revokeSessionAction(s.id), "Device signed out");
                  }}
                >
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others > 0 && (
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              run(revokeOtherSessionsAction, "Signed out of all other devices");
            }}
          >
            Sign out all other devices
          </Button>
        </div>
      )}
    </div>
  );
}
