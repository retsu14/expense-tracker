"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

import { QuickAddForm, type QuickAddContext } from "@/components/ledger/quick-add-form";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { quickAddContextAction } from "@/modules/ledger/presentation/actions";
import { toYmd } from "@/shared/kernel/time";
import { useUiStore } from "@/stores/ui-store";

const cacheKey = (userId: string) => `oink-qa-ctx:${userId}`;

function saveContext(userId: string, data: QuickAddContext) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({ ...data, transaction: null }));
  } catch {
    /* storage unavailable */
  }
}

function loadContext(userId: string): QuickAddContext | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as QuickAddContext;
    return { ...data, today: toYmd(new Date(), data.timezone), transaction: null };
  } catch {
    return null;
  }
}

type State =
  { key: string; data: QuickAddContext; offline: boolean } | { key: string; failed: true };

export function QuickAddModal({ userId }: { userId: string }) {
  const open = useUiStore((s) => s.quickAddOpen);
  const editId = useUiStore((s) => s.editTransactionId);
  const setOpen = useUiStore((s) => s.setQuickAddOpen);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const key = `${editId ?? "new"}-${Date.now()}`;
    quickAddContextAction(editId)
      .then((data) => {
        if (cancelled) return;
        saveContext(userId, data);
        setState({ key, data, offline: false });
      })
      .catch(() => {
        if (cancelled) return;
        const cached = editId ? null : loadContext(userId);
        setState(cached ? { key, data: cached, offline: true } : { key, failed: true });
      });
    return () => {
      cancelled = true;
      setState(null);
    };
  }, [open, editId, userId]);

  const title = editId ? "Edit transaction" : "Add transaction";

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen} title={title}>
      {state === null ? (
        <div className="grid gap-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-12" />
          <Skeleton className="h-16" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-18" />
            ))}
          </div>
          <Skeleton className="h-10" />
        </div>
      ) : "failed" in state ? (
        <p className="flex items-center gap-2 text-body-sm text-fg-muted">
          <CloudOff className="size-5" aria-hidden />
          {editId
            ? "You're offline. Editing needs a connection."
            : "You're offline and Oink hasn't loaded your wallets on this device yet. Connect once, then you can log offline."}
        </p>
      ) : editId && !state.data.transaction ? (
        <p className="text-body-sm text-fg-muted">
          This entry can&apos;t be edited here. Transfer fees change with their transfer.
        </p>
      ) : (
        <>
          {state.offline && (
            <p className="mb-4 flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-caption text-fg">
              <CloudOff className="size-4" aria-hidden />
              Offline mode — this will be saved on your device and synced later.
            </p>
          )}
          <QuickAddForm
            key={state.key}
            ctx={state.data}
            userId={userId}
            onDone={() => {
              setOpen(false);
            }}
          />
        </>
      )}
    </ResponsiveModal>
  );
}
