"use client";

import { Shapes, Trash2, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useUndoableDelete } from "@/components/ledger/use-transaction-feedback";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { bulkUpdateTransactionsAction } from "@/modules/ledger/presentation/actions";

export type BulkOption = { id: string; name: string };

export function BulkBar({
  ids,
  kinds,
  categories,
  accounts,
  onDone,
}: {
  ids: string[];
  kinds: string[];
  categories: (BulkOption & { kind: "expense" | "income" })[];
  accounts: BulkOption[];
  onDone: () => void;
}) {
  const [picker, setPicker] = useState<"category" | "wallet" | null>(null);
  const [pending, startTransition] = useTransition();
  const undoableDelete = useUndoableDelete();
  const onlyKind = kinds.every((k) => k === kinds[0]) ? kinds[0] : null;
  const options = picker === "category" ? categories.filter((c) => c.kind === onlyKind) : accounts;

  const apply = (patch: { categoryId?: string; accountId?: string }) => {
    startTransition(async () => {
      const res = await bulkUpdateTransactionsAction({ ids, ...patch });
      setPicker(null);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        `Updated ${res.data.updated}${res.data.skipped ? ` · ${res.data.skipped} skipped` : ""}`,
      );
      onDone();
    });
  };

  const remove = () => {
    startTransition(async () => {
      if (await undoableDelete(ids, `${ids.length} deleted`)) onDone();
    });
  };

  return (
    <>
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-lg border border-border bg-surface p-2 shadow-2xl md:bottom-6"
      >
        <span className="px-2 text-body-sm font-semibold" aria-live="polite">
          {ids.length} selected
        </span>
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={!ids.length || !onlyKind || pending}
            title={onlyKind ? undefined : "Select only expenses or only income to recategorize"}
            onClick={() => {
              setPicker("category");
            }}
          >
            <Shapes aria-hidden />
            <span className="hidden sm:inline">Category</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!ids.length || pending}
            onClick={() => {
              setPicker("wallet");
            }}
          >
            <Wallet aria-hidden />
            <span className="hidden sm:inline">Wallet</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-expense"
            disabled={!ids.length || pending}
            onClick={remove}
          >
            <Trash2 aria-hidden />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
      <ResponsiveModal
        open={picker !== null}
        onOpenChange={(o) => {
          if (!o) setPicker(null);
        }}
        title={picker === "category" ? "Move to category" : "Move to wallet"}
        description={`${ids.length} transaction${ids.length === 1 ? "" : "s"}`}
      >
        <ul className="grid max-h-[50vh] gap-1 overflow-y-auto">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  apply(picker === "category" ? { categoryId: o.id } : { accountId: o.id });
                }}
                className="flex min-h-11 w-full cursor-pointer items-center rounded-md px-3 text-left hover:bg-surface-2 disabled:opacity-50"
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveModal>
    </>
  );
}
