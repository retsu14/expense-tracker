"use client";

import { ArrowRight, Plus, Split, Star, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { SmartEntry } from "@/components/assistant/smart-entry";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { centavosToInput, formatPeso } from "@/lib/money";
import { isNetworkError, offlineQueue } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";
import type { EntryDraft } from "@/modules/assistant/domain/entry-parser";
import { evaluateAmount, isExpression } from "@/modules/ledger/domain/amount-expression";
import type { TransactionKind } from "@/modules/ledger/domain/transaction";
import {
  createSplitTransactionAction,
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
  const [split, setSplit] = useState(false);
  const [parts, setParts] = useState<SplitPart[]>([
    { categoryId: "", amount: "" },
    { categoryId: "", amount: "" },
  ]);
  const splitting = split && kind === "expense" && !editing;
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

  const entryContext = useMemo(
    () => ({
      today: ctx.today,
      categories: ctx.categories,
      accounts: ctx.accounts.filter((a) => !a.archived),
    }),
    [ctx],
  );

  const applyDraft = (d: EntryDraft) => {
    const k = d.kind === "transfer" && ctx.accounts.length < 2 ? "expense" : d.kind;
    if (k !== kind) changeKind(k);
    if (d.amount) setAmount(d.amount);
    if (d.accountId) setAccountId(d.accountId);
    if (k === "transfer" && d.toAccountId) setToAccountId(d.toAccountId);
    if (d.date) setDate(d.date);
    if (d.note) setNote(d.note);
    if (k !== "transfer" && d.categoryId) {
      setCategoryId(d.categoryId);
      setCategoryTouched(true);
    } else if (k !== "transfer" && d.note.trim().length >= 2) {
      void suggestCategoryAction(k, d.note).then((id) => {
        if (id) setCategoryId(id);
      });
    }
    if (!d.amount) amountRef.current?.focus();
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

  const submitSplit = () => {
    setFormError(null);
    startTransition(async () => {
      let res;
      try {
        res = await createSplitTransactionAction({
          accountId,
          date,
          note,
          idempotencyKey: idempotencyKey.current,
          parts: parts.filter((p) => p.categoryId || p.amount),
        });
      } catch {
        setFormError("Splits need a connection. Try again when you're online.");
        return;
      }
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      onDone();
      celebrateLog(res.data.total, "expense");
      toast.success(`Split saved · ${formatPeso(res.data.total)}`);
    });
  };

  const submit = () => {
    if (splitting) {
      submitSplit();
      return;
    }
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

      {!editing && !splitting && <SmartEntry context={entryContext} onApply={applyDraft} />}

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

      {splitting ? (
        <SplitEditor parts={parts} setParts={setParts} categories={categories} errors={errors} />
      ) : (
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
      )}
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
          {!splitting && (
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
              {err("categoryId") && (
                <p className="text-body-sm text-expense">{err("categoryId")}</p>
              )}
            </fieldset>
          )}
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
            <>
              {kind === "expense" && (
                <Chip
                  selected={split}
                  onClick={() => {
                    setSplit((v) => !v);
                    setErrors({});
                  }}
                >
                  <Split className="size-4" aria-hidden />
                  Split
                </Chip>
              )}
              <Chip
                selected={favorite}
                onClick={() => {
                  setFavorite((f) => !f);
                }}
              >
                <Star className={cn("size-4", favorite ? "fill-current" : "")} aria-hidden />
                Save as favorite
              </Chip>
            </>
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

type SplitPart = { categoryId: string; amount: string };

function SplitEditor({
  parts,
  setParts,
  categories,
  errors,
}: {
  parts: SplitPart[];
  setParts: (fn: (p: SplitPart[]) => SplitPart[]) => void;
  categories: QuickAddContext["categories"];
  errors: Record<string, string[]>;
}) {
  const total = parts.reduce((sum, p) => sum + (evaluateAmount(p.amount) ?? 0), 0);
  const update = (i: number, patch: Partial<SplitPart>) => {
    setParts((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  };

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 flex w-full items-baseline justify-between text-body-sm font-medium">
        Split between categories
        <span className="text-h3 tabular">{formatPeso(total)}</span>
      </legend>
      {parts.map((p, i) => (
        <div key={i} className="grid gap-1">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <NativeSelect
                aria-label={`Part ${i + 1} category`}
                value={p.categoryId}
                onChange={(e) => {
                  update(i, { categoryId: e.target.value });
                }}
              >
                <option value="">Category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Input
              aria-label={`Part ${i + 1} amount`}
              inputMode="decimal"
              placeholder="0"
              value={p.amount}
              onChange={(e) => {
                update(i, { amount: e.target.value });
              }}
              className="w-28 tabular"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove part ${i + 1}`}
              disabled={parts.length <= 2}
              onClick={() => {
                setParts((list) => list.filter((_, j) => j !== i));
              }}
            >
              <X aria-hidden />
            </Button>
          </div>
          {(errors[`parts.${i}.categoryId`] ?? errors[`parts.${i}.amount`]) && (
            <p className="text-body-sm text-expense">
              {errors[`parts.${i}.categoryId`]?.[0] ?? errors[`parts.${i}.amount`]?.[0]}
            </p>
          )}
        </div>
      ))}
      {errors.parts && <p className="text-body-sm text-expense">{errors.parts[0]}</p>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={parts.length >= 8}
        onClick={() => {
          setParts((list) => [...list, { categoryId: "", amount: "" }]);
        }}
      >
        <Plus aria-hidden />
        Add part
      </Button>
    </fieldset>
  );
}
