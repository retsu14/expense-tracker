"use client";

import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { centavosToInput, formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  budgetOverview,
  budgetSuggestions,
} from "@/modules/planning/application/planning.use-cases";
import {
  applyBudgetSuggestionsAction,
  budgetSuggestionsAction,
  createBudgetAction,
  deleteBudgetAction,
  updateBudgetAction,
} from "@/modules/planning/presentation/actions";

type Overview = Awaited<ReturnType<typeof budgetOverview>>;
type Item = Overview["items"][number];
type CategoryOption = { id: string; name: string; icon: string; color: string };

const fmtRange = (start: string, end: string) => {
  const f = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f.format(new Date(`${start}T12:00:00Z`))} – ${f.format(new Date(`${end}T12:00:00Z`))}`;
};

export function BudgetsView({
  overview,
  categories,
  hasPayday,
}: {
  overview: Overview;
  categories: CategoryOption[];
  hasPayday: boolean;
}) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const { items, overall, safe } = overview;
  const categoryItems = items.filter((i) => i.categoryId);
  const available = categories.filter((c) => !items.some((i) => i.categoryId === c.id));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
      <Card className="lg:col-span-5">
        <p className="text-body-sm text-fg-muted">Safe to spend today</p>
        {safe ? (
          <>
            <Amount value={safe.perDay} className="mt-1 block text-display-sm md:text-display" />
            <p className="mt-2 text-body-sm text-fg-muted">
              {safe.daysLeft} {safe.daysLeft === 1 ? "day" : "days"} left ·{" "}
              {fmtRange(safe.range.start, safe.range.end)}
              {safe.reserved > 0 && <> · {formatPeso(safe.reserved)} set aside for bills</>}
            </p>
          </>
        ) : (
          <p className="mt-2 text-body text-fg-muted">
            Add an overall budget to see your daily limit.
          </p>
        )}
        {overview.nextPayday && (
          <p className="mt-3 text-caption text-fg-muted">
            Next payday:{" "}
            {new Intl.DateTimeFormat("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${overview.nextPayday}T12:00:00Z`))}
          </p>
        )}
      </Card>

      <Card className="lg:col-span-7">
        {overall ? (
          <BudgetRow
            item={overall}
            onEdit={() => {
              setEditing(overall);
            }}
            large
          />
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3">
            <p className="font-semibold">No overall budget yet</p>
            <p className="text-body-sm text-fg-muted">
              Set one limit for all your spending this {hasPayday ? "pay cycle or month" : "month"}.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditing("new");
              }}
            >
              <Plus aria-hidden />
              Set overall budget
            </Button>
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-3 lg:col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h2">Categories</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSuggesting(true);
              }}
            >
              <Sparkles aria-hidden />
              Suggest
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing("new");
              }}
              disabled={available.length === 0 && Boolean(overall)}
            >
              <Plus aria-hidden />
              Add budget
            </Button>
          </div>
        </div>
        {categoryItems.length === 0 ? (
          <EmptyState
            title="No category budgets"
            description="Set limits for categories like Food. Tap Suggest to start from your spending."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {categoryItems.map((item) => (
              <li key={item.id}>
                <Card className="h-full">
                  <BudgetRow
                    item={item}
                    onEdit={() => {
                      setEditing(item);
                    }}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={editing === "new" ? "New budget" : "Edit budget"}
      >
        {editing && (
          <BudgetForm
            item={editing === "new" ? null : editing}
            categories={available}
            allowOverall={!overall}
            hasPayday={hasPayday}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={suggesting}
        onOpenChange={setSuggesting}
        title="Suggested budgets"
        description="Based on your last 3 months."
      >
        {suggesting && (
          <Suggestions
            onDone={() => {
              setSuggesting(false);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

function BudgetRow({ item, onEdit, large }: { item: Item; onEdit: () => void; large?: boolean }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={item.icon} color={item.color} size={large ? "lg" : "md"} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-semibold", large && "text-h3")}>{item.name}</p>
          <p className="text-caption font-normal text-fg-muted">
            {item.period === "pay_cycle" ? "Pay cycle" : "Monthly"} ·{" "}
            {fmtRange(item.range.start, item.range.end)}
            {item.carry !== 0 && (
              <>
                {" "}
                · {item.carry > 0 ? "+" : "−"}
                {formatPeso(Math.abs(item.carry))} rolled over
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${item.name} budget`}
          onClick={onEdit}
        >
          <Pencil aria-hidden />
        </Button>
      </div>
      <ProgressBar value={item.pct} status={item.status} label={`${item.name} budget used`} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-body-sm">
        <span className="whitespace-nowrap">
          <Amount value={item.spent} className="font-semibold" />{" "}
          <span className="text-fg-muted">of {formatPeso(item.limit)}</span>
        </span>
        <span
          className={cn(
            "font-medium whitespace-nowrap",
            item.status === "over"
              ? "text-expense"
              : item.status === "warn"
                ? "text-warning"
                : "text-fg-muted",
          )}
        >
          {item.remaining >= 0
            ? `${formatPeso(item.remaining)} left`
            : `${formatPeso(-item.remaining)} over`}
        </span>
      </div>
    </div>
  );
}

function BudgetForm({
  item,
  categories,
  allowOverall,
  hasPayday,
  onDone,
}: {
  item: Item | null;
  categories: CategoryOption[];
  allowOverall: boolean;
  hasPayday: boolean;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState(
    item ? (item.categoryId ?? "") : allowOverall ? "" : (categories[0]?.id ?? ""),
  );
  const [amount, setAmount] = useState(item ? centavosToInput(item.amount) : "");
  const [period, setPeriod] = useState<"monthly" | "pay_cycle">(item?.period ?? "monthly");
  const [rollover, setRollover] = useState(item?.rollover ?? false);
  const [alertPct, setAlertPct] = useState(String(item?.alertPct ?? 80));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      const input = { categoryId, amount, period, rollover, alertPct: Number(alertPct) };
      const res = item ? await updateBudgetAction(item.id, input) : await createBudgetAction(input);
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      toast.success(item ? "Budget updated" : "Budget added");
      onDone();
    });
  };

  const remove = () => {
    if (!item) return;
    startTransition(async () => {
      const res = await deleteBudgetAction(item.id);
      if (res.ok) {
        toast.success("Budget removed");
        onDone();
      } else toast.error(res.error.message);
    });
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {formError && <FormAlert>{formError}</FormAlert>}
      {!item && (
        <div className="grid gap-1.5">
          <Label htmlFor="b-cat">Budget for</Label>
          <NativeSelect
            id="b-cat"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
            }}
          >
            {allowOverall && <option value="">All spending (overall)</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          {errors.categoryId && <p className="text-body-sm text-expense">{errors.categoryId[0]}</p>}
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="b-amount">Limit</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted">
            ₱
          </span>
          <Input
            id="b-amount"
            inputMode="decimal"
            autoFocus
            placeholder="5,000"
            value={amount}
            aria-invalid={errors.amount ? true : undefined}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            className="pl-7 tabular"
          />
        </div>
        {errors.amount && <p className="text-body-sm text-expense">{errors.amount[0]}</p>}
      </div>
      <div className="grid gap-1.5">
        <span className="text-body-sm font-medium">Resets every</span>
        <Segmented
          label="Budget period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "monthly", label: "Month" },
            ...(hasPayday ? [{ value: "pay_cycle" as const, label: "Payday" }] : []),
          ]}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="b-alert">Warn me at</Label>
        <NativeSelect
          id="b-alert"
          value={alertPct}
          onChange={(e) => {
            setAlertPct(e.target.value);
          }}
        >
          {[50, 60, 70, 75, 80, 90, 100].map((p) => (
            <option key={p} value={p}>
              {p}% used
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="b-rollover">Roll over leftovers</Label>
          <p className="text-caption font-normal text-fg-muted">
            Leftovers or overspending carry over.
          </p>
        </div>
        <Switch id="b-rollover" checked={rollover} onCheckedChange={setRollover} />
      </div>
      <div className="flex gap-2">
        {item && (
          <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 aria-hidden />
            Remove
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add budget"}
        </Button>
      </div>
    </form>
  );
}

type Suggestion = Awaited<ReturnType<typeof budgetSuggestions>>[number];

function Suggestions({ onDone }: { onDone: () => void }) {
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void budgetSuggestionsAction().then((rows) => {
      if (cancelled) return;
      const usable = rows.filter((r) => !r.hasBudget && r.average > 0);
      setList(usable);
      setPicked(
        new Map(usable.slice(0, 5).map((r) => [r.categoryId, centavosToInput(r.suggested)])),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (list === null) {
    return <p className="text-body-sm text-fg-muted">Crunching your numbers…</p>;
  }

  if (list.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">
        Not enough history yet. Check back in a few weeks.
      </p>
    );
  }

  const apply = () => {
    startTransition(async () => {
      const items = [...picked.entries()].map(([categoryId, amount]) => ({ categoryId, amount }));
      const res = await applyBudgetSuggestionsAction(items, "monthly");
      if (res.ok) {
        toast.success(`${res.data} budget${res.data === 1 ? "" : "s"} added`);
        onDone();
      } else toast.error(res.error.message);
    });
  };

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {list.map((s) => {
          const on = picked.has(s.categoryId);
          return (
            <li key={s.categoryId} className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label={`Budget ${s.name}`}
                checked={on}
                onChange={(e) => {
                  setPicked((m) => {
                    const next = new Map(m);
                    if (e.target.checked) next.set(s.categoryId, centavosToInput(s.suggested));
                    else next.delete(s.categoryId);
                    return next;
                  });
                }}
                className="size-5 shrink-0 accent-(--accent)"
              />
              <CategoryIcon icon={s.icon} color={s.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="text-caption font-normal text-fg-muted">
                  avg {formatPeso(s.average)}/mo
                </span>
              </span>
              <Input
                aria-label={`${s.name} limit`}
                inputMode="decimal"
                disabled={!on}
                value={picked.get(s.categoryId) ?? centavosToInput(s.suggested)}
                onChange={(e) => {
                  setPicked((m) => new Map(m).set(s.categoryId, e.target.value));
                }}
                className="h-10 w-28 tabular"
              />
            </li>
          );
        })}
      </ul>
      <Button size="lg" onClick={apply} disabled={pending || picked.size === 0}>
        {pending ? "Adding…" : `Add ${picked.size} budget${picked.size === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
