"use client";

import { ArrowRightLeft, Check, Trash2 } from "lucide-react";
import { m, useMotionValue, useTransform } from "motion/react";

import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import { cn } from "@/lib/utils";
import type { TransactionView } from "@/modules/ledger/domain/transaction";

const SWIPE_DELETE = -96;

export function transactionTitle(t: TransactionView) {
  if (t.note) return t.note;
  if (t.kind === "transfer") return `${t.accountName} → ${t.toAccountName ?? "?"}`;
  return t.categoryName ?? "Transaction";
}

type RowProps = {
  tx: TransactionView;
  time: string;
  onOpen: () => void;
  onDelete: () => void;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

export function TransactionRow({
  tx,
  time,
  onOpen,
  onDelete,
  selecting = false,
  selected = false,
  onToggle,
}: RowProps) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [0, SWIPE_DELETE], [0, 1]);
  const subtitle =
    tx.kind === "transfer"
      ? `Transfer · ${tx.accountName} → ${tx.toAccountName ?? "?"}`
      : `${tx.categoryName ?? "Uncategorized"} · ${tx.accountName}${tx.splitGroup ? " · Split" : ""}`;
  const selectable = selecting && !tx.linkedId && tx.kind !== "transfer";

  return (
    <li className="relative overflow-hidden">
      <m.div
        aria-hidden
        style={{ opacity: reveal }}
        className="absolute inset-y-0 right-0 flex w-28 items-center justify-end bg-expense pr-5 text-bg"
      >
        <Trash2 className="size-5" />
      </m.div>
      <m.div
        drag={selecting ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: SWIPE_DELETE * 1.4, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < SWIPE_DELETE) onDelete();
        }}
        className={cn(
          "group relative flex items-center gap-3 bg-surface px-4 py-3 max-xs:gap-2 max-xs:px-3",
          selected && "bg-surface-2",
        )}
      >
        <button
          type="button"
          onClick={selecting ? onToggle : onOpen}
          disabled={selecting && !selectable}
          aria-pressed={selecting ? selected : undefined}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left disabled:cursor-not-allowed disabled:opacity-50 max-xs:gap-2.5"
        >
          {selecting && (
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                selected ? "border-accent bg-accent text-accent-fg" : "border-fg-muted",
              )}
            >
              {selected && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          )}
          {tx.kind === "transfer" ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted max-xs:size-9">
              <ArrowRightLeft className="size-5" aria-hidden />
            </span>
          ) : (
            <CategoryIcon
              icon={tx.categoryIcon}
              color={tx.categoryColor}
              className="max-xs:size-9 max-xs:[&_svg]:size-4"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium max-xs:text-body-sm">
              {transactionTitle(tx)}
            </span>
            <span className="block truncate text-caption font-normal text-fg-muted">
              {subtitle} · {time}
            </span>
          </span>
          <Amount
            value={tx.amount}
            kind={tx.kind}
            sign={tx.kind !== "transfer"}
            className="shrink-0 font-semibold max-xs:text-body-sm"
          />
        </button>
        {!selecting && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${transactionTitle(tx)}`}
            className="hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-expense focus-visible:opacity-100 md:flex"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </m.div>
    </li>
  );
}
