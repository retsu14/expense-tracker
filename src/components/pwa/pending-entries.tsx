"use client";

import { CloudUpload, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { offlineQueue } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";
import { usePwaStore } from "@/stores/pwa-store";

export function PendingEntries() {
  const pending = usePwaStore((s) => s.pending);
  const setPending = usePwaStore((s) => s.setPending);
  if (pending.length === 0) return null;

  const discard = async (key: string) => {
    await offlineQueue.remove(key);
    setPending(pending.filter((p) => p.key !== key));
    toast("Offline entry discarded");
  };

  return (
    <section
      aria-label="Waiting to sync"
      className="overflow-hidden rounded-lg border border-warning/50 bg-warning/10"
    >
      <h2 className="flex items-center gap-2 border-b border-warning/30 px-4 py-2.5 text-body-sm font-semibold">
        <CloudUpload className="size-4" aria-hidden />
        Waiting to sync ({pending.length})
      </h2>
      <ul className="divide-y divide-warning/20">
        {pending.map((p) => (
          <li key={p.key} className="flex items-center gap-3 px-4 py-2.5">
            {p.error && <TriangleAlert className="size-4 shrink-0 text-expense" aria-hidden />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.label}</span>
              <span className={cn("text-caption", p.error ? "text-expense" : "text-fg-muted")}>
                {p.error ?? `Saved offline ${new Date(p.createdAt).toLocaleString("en-PH")}`}
              </span>
            </span>
            <span className="font-semibold tabular">
              {formatPeso(p.kind === "expense" ? -p.amount : p.amount)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Discard ${p.label}`}
              onClick={() => void discard(p.key)}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
