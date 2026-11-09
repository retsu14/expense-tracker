"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { TRASH_RETENTION_DAYS, type TransactionView } from "@/modules/ledger/domain/transaction";
import {
  deleteForeverAction,
  restoreTransactionsAction,
} from "@/modules/ledger/presentation/actions";

import { transactionTitle } from "./transaction-row";

const DAY_MS = 86_400_000;

export function TrashList({ items, timezone }: { items: TransactionView[]; timezone: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });

  if (items.length === 0) {
    return <EmptyState title="Trash is empty" description="Nothing deleted." />;
  }

  const restore = (ids: string[]) => {
    startTransition(async () => {
      const res = await restoreTransactionsAction(ids);
      if (res.ok) toast.success(ids.length > 1 ? "All restored" : "Restored");
      else toast.error(res.error.message);
    });
  };

  const purge = (ids: string[]) => {
    startTransition(async () => {
      const res = await deleteForeverAction(ids);
      setConfirmIds(null);
      if (res.ok) toast.success("Deleted forever");
      else toast.error(res.error.message);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            restore(items.map((i) => i.id));
          }}
        >
          <ArchiveRestore aria-hidden />
          Restore all
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setConfirmIds(items.map((i) => i.id));
          }}
        >
          <Trash2 aria-hidden />
          Empty trash
        </Button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((tx) => {
          const purgeOn = new Date(
            +new Date(tx.deletedAt ?? tx.occurredAt) + TRASH_RETENTION_DAYS * DAY_MS,
          );
          return (
            <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
              <CategoryIcon icon={tx.categoryIcon} color={tx.categoryColor} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{transactionTitle(tx)}</p>
                <p className="text-caption font-normal text-fg-muted">
                  {fmt.format(new Date(tx.occurredAt))} · {tx.accountName} · removed for good on{" "}
                  {fmt.format(purgeOn)}
                </p>
              </div>
              <Amount
                value={tx.amount}
                kind={tx.kind}
                sign={tx.kind !== "transfer"}
                className="font-semibold"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`Restore ${transactionTitle(tx)}`}
                onClick={() => {
                  restore([tx.id]);
                }}
              >
                <ArchiveRestore aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>

      <ResponsiveModal
        open={confirmIds !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmIds(null);
        }}
        title="Empty trash?"
        description="This can't be undone."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setConfirmIds(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirmIds) purge(confirmIds);
            }}
          >
            Delete forever
          </Button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
