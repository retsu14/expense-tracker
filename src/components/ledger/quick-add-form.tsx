"use client";

import { ArrowRight, Star, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { centavosToInput, formatPeso } from "@/lib/money";
import { isNetworkError, offlineQueue } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";
import { evaluateAmount, isExpression } from "@/modules/ledger/domain/amount-expression";
import type { TransactionKind } from "@/modules/ledger/domain/transaction";
import {
  createTemplateAction,
  createTransactionAction,
  type quickAddContextAction,
  suggestCategoryAction,
  updateTransactionAction,
} from "@/modules/ledger/presentation/actions";
import { addDays, toYmd } from "@/shared/kernel/time";

import { CategoryIcon } from "./category-icon";
import { Chip } from "./chip";
import { celebrateLog, showBudgetAlerts, useUndoableDelete } from "./use-transaction-feedback";

export type QuickAddContext = Awaited<ReturnType<typeof quickAddContextAction>>;

const OPERATORS = ["+", "−", "×", "÷"] as const;
const VISIBLE_CATEGORIES = 8;

const newKey = () => crypto.randomUUID();

export function QuickAddForm({
  ctx,
  userId,
  onDone,
}: {
  ctx: QuickAddContext;
  userId: string;
  onDone: () => void;
}) {
  const editing = ctx.transaction;
  const [kind, setKind] = useState<TransactionKind>(editing?.kind ?? "expense");
  const [amount, setAmount] = useState(editing ? centavosToInput(editing.amount) : "");
  const [accountId, setAccountId] = useState(editing?.accountId ?? ctx.lastAccountId ?? "");
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [categoryTouched, setCategoryTouched] = useState(Boolean(editing));
  const [fee, setFee] = useState(editing?.fee ? centavosToInput(editing.fee) : "");
  const [date, setDate] = useState(
    editing ? toYmd(new Date(editing.occurredAt), ctx.timezone) : ctx.today,
  );
  const [note, setNote] = useState(editing?.note ?? "");
  const [favorite, setFavorite] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef(newKey());
  const amountRef = useRef<HTMLInputElement>(null);
  const undoableDelete = useUndoableDelete();

  const categories = useMemo(
    () => ctx.categories.filter((c) => c.kind === kind && !c.system),
    [ctx.categories, kind],
  );
  const visible = showAll ? categories : categories.slice(0, VISIBLE_CATEGORIES);
  const selectedHidden = !showAll && categoryId && !visible.some((c) => c.id === categoryId);
  const evaluated = evaluateAmount(amount);
  const yesterday = addDays(ctx.today, -1);

  const changeKind = (k: TransactionKind) => {
    setKind(k);
    setErrors({});
    if (!ctx.categories.some((c) => c.id === categoryId && c.kind === k)) setCategoryId("");
    if (k === "transfer" && !toAccountId) {
      setToAccountId(ctx.accounts.find((a) => a.id !== accountId)?.id ?? "");
    }
  };

  const insertOperator = (op: string) => {
    const symbol = op === "−" ? "-" : op === "×" ? "*" : op === "÷" ? "/" : op;
    setAmount((a) => (a && !/[-+*/]$/.test(a) ? a + symbol : a));
    amountRef.current?.focus();
  };

  const suggest = () => {
    if (categoryTouched || kind === "transfer" || note.trim().length < 2) return;
    void suggestCategoryAction(kind, note).then((id) => {
      if (id) setCategoryId(id);
    });
  };

  const payload = () => ({
    kind,
    amount,
    accountId,
    toAccountId: kind === "transfer" ? toAccountId : "",
    categoryId: kind === "transfer" ? "" : categoryId,
    fee: kind === "transfer" ? fee : "",
    date,
    note,
    ...(editing ? {} : { idempotencyKey: idempotencyKey.current }),
  });

  const queueOffline = async (
    input: Record<string, unknown>,
    label: string,
    cents: number,
    k: TransactionKind,
  ) => {
    await offlineQueue.enqueue({
      key: String(input.idempotencyKey),
      userId,
      input,
      label,
      amount: cents,
      kind: k,
    });
    window.dispatchEvent(new Event("oink:queued"));
    onDone();
    toast("Saved offline 🐷", { description: "It will sync when you're back online." });
  };

  const offlineLabel = () => {
    if (note.trim()) return note.trim();
    if (kind === "transfer") return "Transfer";
    return ctx.categories.find((c) => c.id === categoryId)?.name ?? "Transaction";
  };

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      if (!editing && !navigator.onLine) {
        if (evaluated === null) {
          setErrors({ amount: ["Enter a valid amount, like 150 or 120+30."] });
          return;
        }
        await queueOffline(payload(), offlineLabel(), evaluated, kind);
        return;
      }
      let res;
      try {
        res = editing
          ? await updateTransactionAction(editing.id, payload())
          : await createTransactionAction(payload());
      } catch (e) {
        if (!editing && isNetworkError(e) && evaluated !== null) {
          await queueOffline(payload(), offlineLabel(), evaluated, kind);
        } else setFormError("Couldn't save. Check your connection and try again.");
        return;
      }
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }

      const logged = evaluated ?? 0;
      if (!editing && favorite && kind !== "transfer") {
        const category = ctx.categories.find((c) => c.id === categoryId);
        const fav = await createTemplateAction({
          name: (note.trim() ? note.trim() : (category?.name ?? "Favorite")).slice(0, 24),
          kind,
          amount,
          categoryId,
          accountId,
          note,
        });
        if (!fav.ok) toast.error(fav.error.message);
      }

      onDone();
      if (editing) {
        toast.success("Transaction updated");
        return;
      }
      celebrateLog(logged, kind);
      if (res.data && typeof res.data === "object") showBudgetAlerts(res.data.alerts);
      const createdId = res.data && typeof res.data === "object" ? res.data.id : null;
      toast.success(
        `${kind === "income" ? "Income" : kind === "transfer" ? "Transfer" : "Expense"} saved · ${formatPeso(logged)}`,
        {
          duration: 6000,
          ...(createdId
            ? {
                action: {
                  label: "Undo",
                  onClick: () => {
                    void undoableDelete([createdId], "Removed");
                  },
                },
              }
            : {}),
        },
      );
    });
  };

  const logTemplate = (t: QuickAddContext["templates"][number]) => {
    startTransition(async () => {
      const input = {
        kind: t.kind,
        amount: centavosToInput(t.amount),
        accountId: t.accountId ?? accountId,
        categoryId: t.categoryId,
        date: ctx.today,
        note: t.note,
        idempotencyKey: newKey(),
      };
      let res;
      try {
        if (!navigator.onLine) throw new TypeError("Failed to fetch");
        res = await createTransactionAction(input);
      } catch (e) {
        if (isNetworkError(e)) await queueOffline(input, t.name, t.amount, t.kind);
        else toast.error("Couldn't save. Try again.");
        return;
      }
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      onDone();
      celebrateLog(t.amount, t.kind);
      showBudgetAlerts(res.data.alerts);
      const id = res.data.id;
      toast.success(`${t.name} · ${formatPeso(t.amount)} logged`, {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void undoableDelete([id], "Removed");
          },
        },
      });
    });
  };

  const err = (k: string) => errors[k]?.[0];
  const templates = ctx.templates.filter((t) => t.kind === kind);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5"
      noValidate
    >
      <Segmented
        label="Type"
        value={kind}
        onChange={changeKind}
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
          ...(ctx.accounts.length > 1 ? [{ value: "transfer" as const, label: "Transfer" }] : []),
        ]}
      />

      {!editing && templates.length > 0 && (
        <div className="grid gap-2">
          <p className="text-caption text-fg-muted">Favorites · tap to log instantly</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {templates.map((t) => (
              <Chip
                key={t.id}
                disabled={pending}
                onClick={() => {
                  logTemplate(t);
                }}
              >
                <Star className="size-3.5 text-warning" aria-hidden />
                {t.name}
                <span className="text-fg-muted tabular">
                  {formatPeso(t.amount, { whole: t.amount % 100 === 0 })}
                </span>
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="qa-amount">Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-h2 text-fg-muted">
            ₱
          </span>
          <input
            ref={amountRef}
            id="qa-amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0"
            value={amount}
            aria-invalid={err("amount") ? true : undefined}
            aria-describedby="qa-amount-help"
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.,+\-*/x×÷() ]/gi, ""));
            }}
            className="h-16 w-full rounded-md border border-border bg-surface-2 pr-4 pl-10 text-display-sm text-fg tabular placeholder:text-fg-muted focus-visible:border-ring aria-invalid:border-expense"
          />
        </div>
        <div id="qa-amount-help" className="flex min-h-6 items-center justify-between gap-2">
          {err("amount") ? (
            <p className="text-body-sm text-expense">{err("amount")}</p>
          ) : (
            <p className="text-caption font-normal text-fg-muted">
              {isExpression(amount) && evaluated !== null
                ? `= ${formatPeso(evaluated)}`
                : "Math works: 120+30"}
            </p>
          )}
          <div className="flex gap-1">
            {OPERATORS.map((op) => (
              <button
                key={op}
                type="button"
                aria-label={`Insert ${op}`}
                onClick={() => {
                  insertOperator(op);
                }}
                className="size-9 cursor-pointer rounded-sm bg-surface-2 text-body font-semibold text-fg-muted hover:text-fg"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      </div>

      {kind === "transfer" ? (
        <div className="grid gap-4">
          <WalletPicker
            label="From"
            accounts={ctx.accounts}
            value={accountId}
            onChange={setAccountId}
            error={err("accountId")}
          />
          <WalletPicker
            label="To"
            accounts={ctx.accounts.filter((a) => a.id !== accountId)}
            value={toAccountId}
            onChange={setToAccountId}
            error={err("toAccountId")}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="qa-fee">Transfer fee (optional)</Label>
            <Input
              id="qa-fee"
              inputMode="decimal"
              placeholder="0"
              value={fee}
              onChange={(e) => {
                setFee(e.target.value);
              }}
              aria-invalid={err("fee") ? true : undefined}
              className="tabular"
            />
            {err("fee") && <p className="text-body-sm text-expense">{err("fee")}</p>}
          </div>
        </div>
      ) : (
        <>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-body-sm font-medium">Category</legend>
            <div className="grid grid-cols-4 gap-2">
              {visible.map((c) => {
                const on = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCategoryId(c.id);
                      setCategoryTouched(true);
                    }}
                    className={cn(
                      "flex min-h-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border p-1.5 text-center text-caption leading-tight transition-colors duration-120",
                      on ? "border-accent bg-surface-2" : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="line-clamp-2">{c.name}</span>
                  </button>
                );
              })}
            </div>
            {selectedHidden && (
              <p className="text-caption text-fg-muted">
                Selected: {ctx.categories.find((c) => c.id === categoryId)?.name}
              </p>
            )}
            {categories.length > VISIBLE_CATEGORIES && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAll((s) => !s);
                }}
              >
                {showAll ? "Show less" : `More (${categories.length - VISIBLE_CATEGORIES})`}
              </Button>
            )}
            {err("categoryId") && <p className="text-body-sm text-expense">{err("categoryId")}</p>}
          </fieldset>
          <WalletPicker
            label="Wallet"
            accounts={ctx.accounts}
            value={accountId}
            onChange={setAccountId}
            error={err("accountId")}
          />
        </>
      )}

      <div className="grid gap-1.5">
        <span className="text-body-sm font-medium" id="qa-date-label">
          Date
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="qa-date-label">
          <Chip
            selected={date === ctx.today}
            onClick={() => {
              setDate(ctx.today);
            }}
          >
            Today
          </Chip>
          <Chip
            selected={date === yesterday}
            onClick={() => {
              setDate(yesterday);
            }}
          >
            Yesterday
          </Chip>
          <input
            type="date"
            aria-label="Pick a date"
            value={date}
            max={addDays(ctx.today, 365)}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-3 text-body-sm text-fg"
          />
        </div>
        {err("date") && <p className="text-body-sm text-expense">{err("date")}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="qa-note">Note</Label>
        <Input
          id="qa-note"
          placeholder={kind === "transfer" ? "e.g. Cash in" : "e.g. Jollibee lunch #work"}
          maxLength={140}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
          onBlur={suggest}
        />
        {err("note") && <p className="text-body-sm text-expense">{err("note")}</p>}
      </div>

      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                if (await undoableDelete([editing.id])) onDone();
              });
            }}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
        ) : (
          kind !== "transfer" && (
            <Chip
              selected={favorite}
              onClick={() => {
                setFavorite((f) => !f);
              }}
            >
              <Star className={cn("size-4", favorite ? "fill-current" : "")} aria-hidden />
              Save as favorite
            </Chip>
          )
        )}
        <Button type="submit" size="lg" className="ml-auto min-w-32" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Save"}
          {!pending && !editing && <ArrowRight aria-hidden />}
        </Button>
      </div>
    </form>
  );
}

function WalletPicker({
  label,
  accounts,
  value,
  onChange,
  error,
}: {
  label: string;
  accounts: QuickAddContext["accounts"];
  value: string;
  onChange: (id: string) => void;
  error?: string | undefined;
}) {
  const id = `wallet-${label.toLowerCase()}`;
  return (
    <div className="grid gap-1.5">
      <span className="text-body-sm font-medium" id={id}>
        {label}
      </span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-labelledby={id}>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            selected={a.id === value}
            onClick={() => {
              onChange(a.id);
            }}
          >
            <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden />
            {a.name}
            <span className={cn("tabular", a.id === value ? "opacity-70" : "text-fg-muted")}>
              {formatPeso(a.balance, { compact: Math.abs(a.balance) >= 10_000_000 })}
            </span>
          </Chip>
        ))}
      </div>
      {error && <p className="text-body-sm text-expense">{error}</p>}
    </div>
  );
}
