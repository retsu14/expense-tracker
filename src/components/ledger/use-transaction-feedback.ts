"use client";

import { toast } from "sonner";

import { formatPeso } from "@/lib/money";
import {
  deleteTransactionsAction,
  restoreTransactionsAction,
} from "@/modules/ledger/presentation/actions";
import { useMascotStore } from "@/stores/mascot-store";
import { useSettingsStore } from "@/stores/settings-store";

export function celebrateLog(amount: number, kind: "expense" | "income" | "transfer") {
  const { mood, setMood, say } = useMascotStore.getState();
  if (useSettingsStore.getState().haptics && "vibrate" in navigator) navigator.vibrate(10);
  setMood(kind === "income" ? "celebrating" : "munch");
  say(
    kind === "income"
      ? `Yay! +${formatPeso(amount)}`
      : kind === "transfer"
        ? "Moved it!"
        : `Nom! ${formatPeso(amount)} logged`,
  );
  setTimeout(() => {
    useMascotStore.getState().setMood(mood);
  }, 2500);
}

export function useUndoableDelete() {
  return async (ids: string[], label = "Transaction deleted") => {
    const res = await deleteTransactionsAction(ids);
    if (!res.ok) {
      toast.error(res.error.message);
      return false;
    }
    toast(label, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          void restoreTransactionsAction(ids).then((r) => {
            if (r.ok) toast.success("Restored");
          });
        },
      },
    });
    return true;
  };
}
