"use client";

import { ListChecks, LoaderCircle } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Amount } from "@/components/ledger/amount";
import { useUndoableDelete } from "@/components/ledger/use-transaction-feedback";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DayTotal } from "@/modules/ledger/domain/ports";
import type { TransactionView } from "@/modules/ledger/domain/transaction";
import { loadTransactionsAction } from "@/modules/ledger/presentation/actions";
import { addDays, toYmd } from "@/shared/kernel/time";
import { useUiStore } from "@/stores/ui-store";

import { BulkBar, type BulkOption } from "./bulk-bar";
import { TransactionRow } from "./transaction-row";

type Page = {
  items: TransactionView[];
  nextCursor: string | null;
  dayTotals: DayTotal[];
  timezone: string;
};

type Props = {
  initial: Page;
  params: Record<string, string>;
  today: string;
  empty: { title: string; description: string; action?: ReactNode };
  categories: (BulkOption & { kind: "expense" | "income" })[];
  accounts: BulkOption[];
};

export function ActivityList({ initial, params, today, empty, categories, accounts }: Props) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const signature = JSON.stringify(initial);
  const [source, setSource] = useState(signature);
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [totals, setTotals] = useState(() => new Map(initial.dayTotals.map((d) => [d.day, d])));
  const [loading, startLoading] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const openEdit = useUiStore((s) => s.openEditTransaction);
  const undoableDelete = useUndoableDelete();
  const tz = initial.timezone;

  if (source !== signature) {
    setSource(signature);
    setItems(initial.items);
    setCursor(initial.nextCursor);
    setTotals(new Map(initial.dayTotals.map((d) => [d.day, d])));
    setSelected(new Set());
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const loadMore = useCallback(() => {
    if (!cursor || loading) return;
    startLoading(async () => {
      try {
        const page = await loadTransactionsAction(params, cursor, 30);
        setItems((prev) => [
          ...prev,
          ...page.items.filter((i) => !prev.some((p) => p.id === i.id)),
        ]);
        setCursor(page.nextCursor);
        setTotals((prev) => {
          const next = new Map(prev);
          for (const d of page.dayTotals) next.set(d.day, d);
          return next;
        });
      } catch {
        toast.error("Couldn't load more. Check your connection.");
      }
    });
  }, [cursor, loading, params]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [cursor, loadMore]);

  const remove = (tx: TransactionView) => {
    setItems((prev) => prev.filter((i) => i.id !== tx.id));
    void undoableDelete([tx.id]).then((ok) => {
      if (!ok) setItems((prev) => [tx, ...prev].sort(byNewest));
    });
  };

  if (items.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} action={empty.action} />;
  }

  const groups = groupByDay(items, tz);
  const timeFmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="-mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={selecting}
          onClick={() => {
            if (selecting) stopSelecting();
            else setSelecting(true);
          }}
        >
          <ListChecks aria-hidden />
          {selecting ? "Done" : "Select"}
        </Button>
      </div>
      {groups.map(([day, txs]) => {
        const total = totals.get(day);
        return (
          <section
            key={day}
            aria-labelledby={`day-${day}`}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <h2 id={`day-${day}`} className="text-body-sm font-semibold">
                {dayLabel(day, today)}
              </h2>
              <p className="flex gap-3 text-caption text-fg-muted">
                {total && total.income > 0 && <Amount value={total.income} kind="income" sign />}
                {total && total.expense > 0 && <Amount value={total.expense} kind="expense" sign />}
              </p>
            </header>
            <ul className="divide-y divide-border">
              {txs.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  time={timeFmt.format(new Date(tx.occurredAt))}
                  onOpen={() => {
                    if (tx.linkedId) {
                      toast("Transfer fees update with their transfer.");
                      return;
                    }
                    openEdit(tx.id);
                  }}
                  onDelete={() => {
                    remove(tx);
                  }}
                  selecting={selecting}
                  selected={selected.has(tx.id)}
                  onToggle={() => {
                    toggle(tx.id);
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {selecting && (
        <BulkBar
          ids={[...selected]}
          kinds={items.filter((i) => selected.has(i.id)).map((i) => i.kind)}
          categories={categories}
          accounts={accounts}
          onDone={stopSelecting}
        />
      )}

      <div ref={sentinel} className="flex justify-center py-2">
        {cursor ? (
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {loading ? "Loading…" : "Load more"}
          </Button>
        ) : (
          items.length > 10 && (
            <p className="text-caption text-fg-muted">That&apos;s everything 🐽</p>
          )
        )}
      </div>
    </div>
  );
}

const byNewest = (a: TransactionView, b: TransactionView) =>
  +new Date(b.occurredAt) - +new Date(a.occurredAt) || b.id.localeCompare(a.id);

function groupByDay(items: TransactionView[], tz: string) {
  const map = new Map<string, TransactionView[]>();
  for (const tx of items) {
    const day = toYmd(new Date(tx.occurredAt), tz);
    const list = map.get(day);
    if (list) list.push(tx);
    else map.set(day, [tx]);
  }
  return [...map.entries()];
}

function dayLabel(day: string, today: string) {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}
