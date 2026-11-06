"use client";

import { useState } from "react";

import { CategoryIcon } from "@/components/ledger/category-icon";
import { Chip } from "@/components/ledger/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { centavosToInput } from "@/lib/money";
import type { CategoryKind } from "@/modules/ledger/domain/category";
import type { TransactionKind } from "@/modules/ledger/domain/transaction";
import {
  EMPTY_FILTER,
  type Period,
  PERIOD_LABEL,
  PERIODS,
  type TransactionFilter,
} from "@/modules/ledger/domain/transaction-query";

export type FilterOption = {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: TransactionFilter;
  accounts: { id: string; name: string; color: string }[];
  categories: FilterOption[];
  onApply: (filter: TransactionFilter) => void;
};

const toCentavos = (v: string) => {
  const n = Number(v.replace(/,/g, ""));
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export function FilterSheet(props: Props) {
  return (
    <ResponsiveModal open={props.open} onOpenChange={props.onOpenChange} title="Filters">
      {props.open && <FilterForm {...props} />}
    </ResponsiveModal>
  );
}

function FilterForm({ filter, accounts, categories, onApply }: Props) {
  const [period, setPeriod] = useState<Period>(filter.period);
  const [from, setFrom] = useState(filter.from ?? "");
  const [to, setTo] = useState(filter.to ?? "");
  const [kind, setKind] = useState<TransactionKind | "all">(filter.kind ?? "all");
  const [cats, setCats] = useState(new Set(filter.categoryIds));
  const [accts, setAccts] = useState(new Set(filter.accountIds));
  const [min, setMin] = useState(filter.min !== null ? centavosToInput(filter.min) : "");
  const [max, setMax] = useState(filter.max !== null ? centavosToInput(filter.max) : "");

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const visibleCats = categories.filter(
    (c) => kind === "all" || kind === "transfer" || c.kind === kind,
  );

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onApply({
          q: filter.q,
          period,
          from: period === "custom" && from ? from : null,
          to: period === "custom" && to ? to : null,
          kind: kind === "all" ? null : kind,
          categoryIds: [...cats].filter((id) => visibleCats.some((c) => c.id === id)),
          accountIds: [...accts],
          min: toCentavos(min),
          max: toCentavos(max),
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="f-period">Date</Label>
        <NativeSelect
          id="f-period"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as Period);
          }}
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABEL[p]}
            </option>
          ))}
        </NativeSelect>
        {period === "custom" && (
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Input
              type="date"
              aria-label="From"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
              }}
            />
            <Input
              type="date"
              aria-label="To"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-1.5">
        <span className="text-body-sm font-medium">Type</span>
        <Segmented
          label="Type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All" },
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
            { value: "transfer", label: "Transfer" },
          ]}
        />
      </div>

      {kind !== "transfer" && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-body-sm font-medium">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {visibleCats.map((c) => (
              <Chip
                key={c.id}
                selected={cats.has(c.id)}
                onClick={() => {
                  setCats((s) => toggle(s, c.id));
                }}
                className="pl-1.5"
              >
                <CategoryIcon icon={c.icon} color={c.color} size="sm" className="size-7" />
                {c.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-body-sm font-medium">Wallets</legend>
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <Chip
              key={a.id}
              selected={accts.has(a.id)}
              onClick={() => {
                setAccts((s) => toggle(s, a.id));
              }}
            >
              <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden />
              {a.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-body-sm font-medium">Amount (₱)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="decimal"
            aria-label="Minimum amount"
            placeholder="Min"
            value={min}
            onChange={(e) => {
              setMin(e.target.value);
            }}
          />
          <Input
            inputMode="decimal"
            aria-label="Maximum amount"
            placeholder="Max"
            value={max}
            onChange={(e) => {
              setMax(e.target.value);
            }}
          />
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onApply({ ...EMPTY_FILTER, q: filter.q });
          }}
        >
          Reset
        </Button>
        <Button type="submit" className="flex-1">
          Show results
        </Button>
      </div>
    </form>
  );
}
