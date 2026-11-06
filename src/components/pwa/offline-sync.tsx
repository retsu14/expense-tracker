"use client";

import { CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { isNetworkError, offlineQueue, processQueue } from "@/lib/offline-queue";
import { createTransactionAction } from "@/modules/ledger/presentation/actions";
import { usePwaStore } from "@/stores/pwa-store";

const RETRY_MS = 30_000;

export function OfflineSync({ userId }: { userId: string }) {
  const router = useRouter();
  const online = usePwaStore((s) => s.online);
  const pending = usePwaStore((s) => s.pending);
  const setOnline = usePwaStore((s) => s.setOnline);
  const setPending = usePwaStore((s) => s.setPending);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await offlineQueue.list(userId));
    } catch {
      setPending([]);
    }
  }, [setPending, userId]);

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    try {
      const items = await offlineQueue.list(userId);
      if (!items.some((i) => !i.error)) return;
      const { synced, failed } = await processQueue(
        items,
        async (item) => {
          try {
            const res = await createTransactionAction(item.input);
            return res.ok ? { ok: true } : { ok: false, retry: false, message: res.error.message };
          } catch (e) {
            return { ok: false, retry: true, message: isNetworkError(e) ? "offline" : "error" };
          }
        },
        offlineQueue,
      );
      if (synced) {
        toast.success(`Synced ${synced} offline ${synced === 1 ? "entry" : "entries"} 🐷`);
        router.refresh();
      }
      if (failed)
        toast.error(
          `${failed} offline ${failed === 1 ? "entry needs" : "entries need"} attention in Activity.`,
        );
    } finally {
      running.current = false;
      await refresh();
    }
  }, [refresh, router, userId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh().then(sync);

    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => {
      setOnline(false);
    };
    const onQueued = () => {
      void refresh();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("oink:queued", onQueued);
    const timer = setInterval(() => {
      void sync();
    }, RETRY_MS);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("oink:queued", onQueued);
      clearInterval(timer);
    };
  }, [refresh, setOnline, sync]);

  const waiting = pending.filter((p) => !p.error).length;
  if (online && waiting === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-caption font-semibold text-bg"
    >
      <CloudOff className="size-4" aria-hidden />
      {online
        ? `${waiting} offline ${waiting === 1 ? "entry" : "entries"} waiting to sync…`
        : waiting
          ? `You're offline · ${waiting} ${waiting === 1 ? "entry" : "entries"} will sync later`
          : "You're offline · new entries will sync when you're back"}
    </div>
  );
}
