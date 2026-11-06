"use client";

import { useEffect, useState } from "react";

import { QuickAddForm, type QuickAddContext } from "@/components/ledger/quick-add-form";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { quickAddContextAction } from "@/modules/ledger/presentation/actions";
import { useUiStore } from "@/stores/ui-store";

export function QuickAddModal() {
  const open = useUiStore((s) => s.quickAddOpen);
  const editId = useUiStore((s) => s.editTransactionId);
  const setOpen = useUiStore((s) => s.setQuickAddOpen);
  const [ctx, setCtx] = useState<{ key: string; data: QuickAddContext } | null>(null);
  const requestKey = editId ?? "new";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void quickAddContextAction(editId).then((data) => {
      if (!cancelled) setCtx({ key: `${requestKey}-${Date.now()}`, data });
    });
    return () => {
      cancelled = true;
      setCtx(null);
    };
  }, [open, editId, requestKey]);

  const title = editId ? "Edit transaction" : "Add transaction";

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen} title={title}>
      {ctx ? (
        editId && !ctx.data.transaction ? (
          <p className="text-body-sm text-fg-muted">
            This entry can&apos;t be edited here. Transfer fees change with their transfer.
          </p>
        ) : (
          <QuickAddForm
            key={ctx.key}
            ctx={ctx.data}
            onDone={() => {
              setOpen(false);
            }}
          />
        )
      ) : (
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
      )}
    </ResponsiveModal>
  );
}
