"use client";

import { ArrowRightLeft, Trash2 } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";

import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import type { TransactionView } from "@/modules/ledger/domain/transaction";

const SWIPE_DELETE = -96;

export function transactionTitle(t: TransactionView) {
  if (t.note) return t.note;
  if (t.kind === "transfer") return `${t.accountName} → ${t.toAccountName ?? "?"}`;
  return t.categoryName ?? "Transaction";
}

export function TransactionRow({
  tx,
  time,
  onOpen,
  onDelete,
}: {
  tx: TransactionView;
  time: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [0, SWIPE_DELETE], [0, 1]);
  const subtitle =
    tx.kind === "transfer"
      ? `Transfer · ${tx.accountName} → ${tx.toAccountName ?? "?"}`
      : `${tx.categoryName ?? "Uncategorized"} · ${tx.accountName}`;

  return (
    <li className="relative overflow-hidden">
      <motion.div
        aria-hidden
        style={{ opacity: reveal }}
        className="absolute inset-y-0 right-0 flex w-28 items-center justify-end bg-expense pr-5 text-bg"
      >
        <Trash2 className="size-5" />
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: SWIPE_DELETE * 1.4, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < SWIPE_DELETE) onDelete();
        }}
        className="group relative flex items-center gap-3 bg-surface px-4 py-3"
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left"
        >
          {tx.kind === "transfer" ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
              <ArrowRightLeft className="size-5" aria-hidden />
            </span>
          ) : (
            <CategoryIcon icon={tx.categoryIcon} color={tx.categoryColor} />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{transactionTitle(tx)}</span>
            <span className="block truncate text-caption font-normal text-fg-muted">
              {subtitle} · {time}
            </span>
          </span>
          <Amount
            value={tx.amount}
            kind={tx.kind}
            sign={tx.kind !== "transfer"}
            className="font-semibold"
          />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${transactionTitle(tx)}`}
          className="hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-expense focus-visible:opacity-100 md:flex"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </motion.div>
    </li>
  );
}
