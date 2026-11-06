"use client";

import {
  CalendarClock,
  ChartPie,
  Eye,
  House,
  type LucideIcon,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Shapes,
  Sun,
  Target,
  Trash2,
  Wallet,
  Bell,
  PiggyBank,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { CategoryIcon } from "@/components/ledger/category-icon";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionView } from "@/modules/ledger/domain/transaction";
import { loadTransactionsAction } from "@/modules/ledger/presentation/actions";
import { useSettingsStore } from "@/stores/settings-store";
import { useUiStore } from "@/stores/ui-store";

type Command = {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        >
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          {open && (
            <Palette
              close={() => {
                onOpenChange(false);
              }}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Palette({ close }: { close: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  const openEdit = useUiStore((s) => s.openEditTransaction);
  const toggleHidden = useSettingsStore((s) => s.update);
  const hidden = useSettingsStore((s) => s.hideAmounts);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<TransactionView[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };
    return [
      {
        id: "add",
        label: "Add transaction",
        group: "Actions",
        icon: Plus,
        keywords: "new expense income log",
        run: () => {
          close();
          setQuickAddOpen(true);
        },
      },
      {
        id: "hide",
        label: hidden ? "Show amounts" : "Hide amounts",
        group: "Actions",
        icon: Eye,
        keywords: "privacy blur",
        run: () => {
          toggleHidden({ hideAmounts: !hidden });
          close();
        },
      },
      {
        id: "theme",
        label: resolvedTheme === "light" ? "Switch to dark mode" : "Switch to light mode",
        group: "Actions",
        icon: resolvedTheme === "light" ? Moon : Sun,
        keywords: "theme appearance",
        run: () => {
          setTheme(resolvedTheme === "light" ? "dark" : "light");
          close();
        },
      },
      { id: "home", label: "Home", group: "Go to", icon: House, run: go("/") },
      {
        id: "activity",
        label: "Activity",
        group: "Go to",
        icon: ReceiptText,
        keywords: "transactions history",
        run: go("/activity"),
      },
      {
        id: "budgets",
        label: "Budgets",
        group: "Go to",
        icon: Target,
        keywords: "plan",
        run: go("/plan"),
      },
      {
        id: "bills",
        label: "Bills",
        group: "Go to",
        icon: CalendarClock,
        keywords: "recurring subscriptions",
        run: go("/plan/bills"),
      },
      {
        id: "goals",
        label: "Goals",
        group: "Go to",
        icon: PiggyBank,
        keywords: "savings",
        run: go("/plan/goals"),
      },
      {
        id: "insights",
        label: "Insights",
        group: "Go to",
        icon: ChartPie,
        keywords: "stats charts reports",
        run: go("/insights"),
      },
      {
        id: "accounts",
        label: "Accounts",
        group: "Go to",
        icon: Wallet,
        keywords: "wallets gcash bank",
        run: go("/accounts"),
      },
      {
        id: "categories",
        label: "Categories & favorites",
        group: "Go to",
        icon: Shapes,
        run: go("/settings/categories"),
      },
      {
        id: "notifications",
        label: "Notifications",
        group: "Go to",
        icon: Bell,
        run: go("/notifications"),
      },
      { id: "trash", label: "Trash", group: "Go to", icon: Trash2, run: go("/trash") },
      {
        id: "settings",
        label: "Settings",
        group: "Go to",
        icon: Settings,
        keywords: "profile password",
        run: go("/settings"),
      },
    ];
  }, [close, router, setQuickAddOpen, hidden, toggleHidden, resolvedTheme, setTheme]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q))
    : commands;

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void loadTransactionsAction({ q }, null, 5).then((page) => {
        if (!cancelled) setResults(page.items);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const txItems = q.length >= 2 ? results : [];
  const total = filtered.length + txItems.length + (q.length >= 2 ? 1 : 0);
  const index = Math.min(active, Math.max(0, total - 1));

  const runAt = (i: number) => {
    if (i < filtered.length) {
      filtered[i]?.run();
      return;
    }
    const tx = txItems[i - filtered.length];
    if (tx) {
      close();
      if (!tx.linkedId) openEdit(tx.id);
      return;
    }
    close();
    router.push(`/activity?q=${encodeURIComponent(query.trim())}`);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const option = (i: number, content: React.ReactNode) => (
    <li
      key={i}
      id={`${listId}-${i}`}
      role="option"
      aria-selected={i === index}
      data-index={i}
      onMouseMove={() => {
        setActive(i);
      }}
      onClick={() => {
        runAt(i);
      }}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-body-sm",
        i === index ? "bg-surface-2 text-fg" : "text-fg-muted",
      )}
    >
      {content}
    </li>
  );

  let groupShown = "";
  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-5 text-fg-muted" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={total ? `${listId}-${index}` : undefined}
          aria-label="Search commands and transactions"
          placeholder="Search or jump to…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (total ? (a + 1) % total : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (total ? (a - 1 + total) % total : 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runAt(index);
            }
          }}
          className="h-14 flex-1 bg-transparent text-body outline-none placeholder:text-fg-muted"
        />
        <kbd className="hidden rounded border border-border px-1.5 text-caption text-fg-muted sm:block">
          Esc
        </kbd>
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Results"
        className="overflow-y-auto p-2"
      >
        {filtered.map((c, i) => {
          const header = c.group !== groupShown;
          groupShown = c.group;
          const Icon = c.icon;
          return [
            header && (
              <li
                key={`h-${c.group}`}
                role="presentation"
                className="px-3 pt-2 pb-1 text-caption text-fg-muted"
              >
                {c.group}
              </li>
            ),
            option(
              i,
              <>
                <Icon className="size-4" aria-hidden />
                <span className="flex-1 text-fg">{c.label}</span>
              </>,
            ),
          ];
        })}
        {txItems.length > 0 && (
          <li role="presentation" className="px-3 pt-2 pb-1 text-caption text-fg-muted">
            Transactions
          </li>
        )}
        {txItems.map((tx, j) =>
          option(
            filtered.length + j,
            <>
              <CategoryIcon
                icon={tx.categoryIcon}
                color={tx.categoryColor}
                size="sm"
                className="size-7 [&_svg]:size-3.5"
              />
              <span className="min-w-0 flex-1 truncate text-fg">
                {tx.note ? tx.note : (tx.categoryName ?? "Transaction")}
              </span>
              <span className="tabular">
                {formatPeso(tx.kind === "expense" ? -tx.amount : tx.amount)}
              </span>
            </>,
          ),
        )}
        {q.length >= 2 &&
          option(
            filtered.length + txItems.length,
            <>
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-fg">
                Search all transactions for &ldquo;{query.trim()}&rdquo;
              </span>
            </>,
          )}
        {total === 0 && (
          <li className="px-3 py-6 text-center text-body-sm text-fg-muted">No matches</li>
        )}
      </ul>
    </div>
  );
}
