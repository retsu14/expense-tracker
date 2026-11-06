"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Chip } from "@/components/ledger/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import {
  EMPTY_FILTER,
  filterToParams,
  PERIOD_LABEL,
  type TransactionFilter,
} from "@/modules/ledger/domain/transaction-query";
import type { SavedFilter } from "@/modules/ledger/domain/ports";

import { FilterSheet, type FilterOption } from "./filter-sheet";
import { SavedViews } from "./saved-views";

type Props = {
  filter: TransactionFilter;
  accounts: { id: string; name: string; color: string }[];
  categories: FilterOption[];
  views: SavedFilter[];
};

export function ActivityToolbar({ filter, accounts, categories, views }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filter.q);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const apply = (next: TransactionFilter) => {
    const qs = filterToParams(next).toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    if (q === filter.q) return;
    const t = setTimeout(() => {
      apply({ ...filter, q });
    }, 300);
    return () => {
      clearTimeout(t);
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "/" && !target?.closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const nameOf = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? "Unknown";

  const chips: { key: string; label: string; clear: () => TransactionFilter }[] = [];
  if (filter.period !== "all") {
    chips.push({
      key: "period",
      label:
        filter.period === "custom"
          ? `${filter.from ?? "…"} – ${filter.to ?? "…"}`
          : PERIOD_LABEL[filter.period],
      clear: () => ({ ...filter, period: "all", from: null, to: null }),
    });
  }
  if (filter.kind) {
    chips.push({
      key: "kind",
      label: `${filter.kind.charAt(0).toUpperCase()}${filter.kind.slice(1)}`,
      clear: () => ({ ...filter, kind: null }),
    });
  }
  for (const id of filter.categoryIds) {
    chips.push({
      key: `c-${id}`,
      label: nameOf(categories, id),
      clear: () => ({ ...filter, categoryIds: filter.categoryIds.filter((x) => x !== id) }),
    });
  }
  for (const id of filter.accountIds) {
    chips.push({
      key: `a-${id}`,
      label: nameOf(accounts, id),
      clear: () => ({ ...filter, accountIds: filter.accountIds.filter((x) => x !== id) }),
    });
  }
  if (filter.min !== null || filter.max !== null) {
    chips.push({
      key: "amount",
      label:
        filter.min !== null && filter.max !== null
          ? `${formatPeso(filter.min)} – ${formatPeso(filter.max)}`
          : filter.min !== null
            ? `≥ ${formatPeso(filter.min)}`
            : `≤ ${formatPeso(filter.max ?? 0)}`,
      clear: () => ({ ...filter, min: null, max: null }),
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search transactions"
            placeholder="Search notes, categories, #tags, >500"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
          }}
          aria-label={`Filters${chips.length ? `, ${chips.length} active` : ""}`}
        >
          <SlidersHorizontal aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {chips.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-accent text-caption text-accent-fg">
              {chips.length}
            </span>
          )}
        </Button>
      </div>

      <SavedViews views={views} filter={filter} />

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
          {chips.map((c) => (
            <Chip
              key={c.key}
              onClick={() => {
                apply(c.clear());
              }}
              aria-label={`Remove filter ${c.label}`}
              className="min-h-9"
            >
              {c.label}
              <X className="size-3.5" aria-hidden />
            </Chip>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              apply(EMPTY_FILTER);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        filter={{ ...filter, q }}
        accounts={accounts}
        categories={categories}
        onApply={(f) => {
          apply(f);
          setOpen(false);
        }}
      />
    </div>
  );
}
