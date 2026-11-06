"use client";

import { toast } from "sonner";

import { useUndoableDelete } from "@/components/ledger/use-transaction-feedback";
import type { TransactionView } from "@/modules/ledger/domain/transaction";
import { useUiStore } from "@/stores/ui-store";

import { TransactionRow } from "./transaction-row";

export function RecentTransactions({
  items,
  timezone,
}: {
  items: TransactionView[];
  timezone: string;
}) {
  const openEdit = useUiStore((s) => s.openEditTransaction);
  const undoableDelete = useUndoableDelete();
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <ul className="-mx-4 divide-y divide-border md:-mx-5">
      {items.map((tx) => (
        <TransactionRow
          key={tx.id}
          tx={tx}
          time={fmt.format(new Date(tx.occurredAt))}
          onOpen={() => {
            if (tx.linkedId) toast("Transfer fees update with their transfer.");
            else openEdit(tx.id);
          }}
          onDelete={() => {
            void undoableDelete([tx.id]);
          }}
        />
      ))}
    </ul>
  );
}
