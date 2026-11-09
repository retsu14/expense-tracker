"use client";

import { ArrowDownLeft, ArrowUpRight, Check, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Amount } from "@/components/ledger/amount";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { centavosToInput, formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DebtDirection, DebtWithProgress } from "@/modules/planning/domain/debt";
import {
  createDebtAction,
  deleteDebtAction,
  recordDebtPaymentAction,
  settleDebtAction,
  updateDebtAction,
} from "@/modules/planning/presentation/actions";

type Option = { id: string; name: string };

const fmtDate = (ymd: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T12:00:00Z`));

export function DebtsView({
  debts,
  totals,
  accounts,
}: {
  debts: DebtWithProgress[];
  totals: { owe: number; owed: number; net: number };
  accounts: Option[];
}) {
  const [editing, setEditing] = useState<DebtWithProgress | DebtDirection | null>(null);
  const [paying, setPaying] = useState<DebtWithProgress | null>(null);
  const [pending, startTransition] = useTransition();
  const open = debts.filter((d) => d.status !== "settled");
  const settled = debts.filter((d) => d.status === "settled");

  const settle = (d: DebtWithProgress) => {
    startTransition(async () => {
      const res = await settleDebtAction(d.id);
      if (res.ok) toast.success(`${d.person} marked as settled`);
    });
  };

  const section = (direction: DebtDirection) => {
    const list = open.filter((d) => d.direction === direction);
    if (list.length === 0) return null;
    return (
      <section className="grid gap-3">
        <h2 className="text-h3">{direction === "i_owe" ? "You owe" : "Owed to you"}</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((d) => (
            <li key={d.id}>
              <Card className="grid h-full gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      d.direction === "i_owe"
                        ? "bg-expense/15 text-expense"
                        : "bg-income/15 text-income",
                    )}
                  >
                    {d.direction === "i_owe" ? (
                      <ArrowUpRight className="size-5" aria-hidden />
                    ) : (
                      <ArrowDownLeft className="size-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.person}</p>
                    <p
                      className={cn(
                        "text-caption",
                        d.status === "overdue"
                          ? "text-expense"
                          : d.status === "due_soon"
                            ? "text-warning"
                            : "text-fg-muted",
                      )}
                    >
                      {d.dueDate
                        ? d.status === "overdue"
                          ? `Overdue since ${fmtDate(d.dueDate)}`
                          : `Due ${fmtDate(d.dueDate)}`
                        : "No due date"}
                      {d.note && ` · ${d.note}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${d.person}`}
                    onClick={() => {
                      setEditing(d);
                    }}
                  >
                    <Pencil aria-hidden />
                  </Button>
                </div>
                <ProgressBar
                  value={d.pct}
                  status={d.direction === "i_owe" ? "warn" : "ok"}
                  label={`${d.person} paid`}
                />
                <div className="flex items-baseline justify-between text-body-sm">
                  <span>
                    <Amount value={d.remaining} className="font-semibold" />{" "}
                    <span className="text-fg-muted">left of {formatPeso(d.principal)}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPaying(d);
                    }}
                  >
                    <HandCoins aria-hidden />
                    {d.direction === "i_owe" ? "Pay" : "Received"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      settle(d);
                    }}
                  >
                    <Check aria-hidden />
                    Settled
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-caption text-fg-muted">You owe</p>
          <Amount value={totals.owe} className="text-h3 md:text-h2" />
        </Card>
        <Card className="p-4">
          <p className="text-caption text-fg-muted">Owed to you</p>
          <Amount value={totals.owed} kind="income" className="text-h3 md:text-h2" />
        </Card>
        <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing("i_owe");
            }}
          >
            <Plus aria-hidden />I borrowed
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing("owed_to_me");
            }}
          >
            <Plus aria-hidden />I lent
          </Button>
        </div>
      </div>

      {open.length === 0 ? (
        <EmptyState title="No utang to track" description="Track money you lent or borrowed." />
      ) : (
        <>
          {section("owed_to_me")}
          {section("i_owe")}
        </>
      )}

      {settled.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-h3 text-fg-muted">Settled</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {settled.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-body-sm">
                <Check className="size-4 text-income" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {d.direction === "i_owe" ? `You paid ${d.person}` : `${d.person} paid you`}
                </span>
                <span className="text-fg-muted tabular">{formatPeso(d.principal)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${d.person} record`}
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await deleteDebtAction(d.id);
                      if (res.ok) toast.success("Removed");
                    });
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={
          typeof editing === "object" && editing
            ? "Edit debt"
            : editing === "i_owe"
              ? "Money you borrowed"
              : "Money you lent"
        }
      >
        {editing && (
          <DebtForm
            debt={typeof editing === "object" ? editing : null}
            direction={typeof editing === "object" ? editing.direction : editing}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={paying !== null}
        onOpenChange={(o) => {
          if (!o) setPaying(null);
        }}
        title={
          paying?.direction === "i_owe"
            ? `Pay ${paying.person}`
            : `Received from ${paying?.person ?? ""}`
        }
        description={paying ? `${formatPeso(paying.remaining)} left` : undefined}
      >
        {paying && (
          <PaymentForm
            debt={paying}
            accounts={accounts}
            onDone={() => {
              setPaying(null);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

function DebtForm({
  debt,
  direction: initial,
  onDone,
}: {
  debt: DebtWithProgress | null;
  direction: DebtDirection;
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<DebtDirection>(initial);
  const [person, setPerson] = useState(debt?.person ?? "");
  const [amount, setAmount] = useState(debt ? centavosToInput(debt.principal) : "");
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? "");
  const [note, setNote] = useState(debt?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      const input = { direction, person, amount, dueDate, note };
      const res = debt ? await updateDebtAction(debt.id, input) : await createDebtAction(input);
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      toast.success(debt ? "Updated" : "Added");
      onDone();
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
      <Segmented
        label="Direction"
        value={direction}
        onChange={setDirection}
        options={[
          { value: "owed_to_me", label: "I lent" },
          { value: "i_owe", label: "I borrowed" },
        ]}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="d-person">{direction === "i_owe" ? "Borrowed from" : "Lent to"}</Label>
        <Input
          id="d-person"
          autoFocus
          maxLength={40}
          placeholder="Juan"
          value={person}
          aria-invalid={errors.person ? true : undefined}
          onChange={(e) => {
            setPerson(e.target.value);
          }}
        />
        {errors.person && <p className="text-body-sm text-expense">{errors.person[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="d-amount">Amount</Label>
          <Input
            id="d-amount"
            inputMode="decimal"
            placeholder="1,000"
            value={amount}
            aria-invalid={errors.amount ? true : undefined}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            className="tabular"
          />
          {errors.amount && <p className="text-body-sm text-expense">{errors.amount[0]}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-due">Due (optional)</Label>
          <Input
            id="d-due"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="d-note">Note</Label>
        <Input
          id="d-note"
          maxLength={80}
          placeholder="For concert tickets"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : debt ? "Save changes" : "Add"}
      </Button>
    </form>
  );
}

function PaymentForm({
  debt,
  accounts,
  onDone,
}: {
  debt: DebtWithProgress;
  accounts: Option[];
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(centavosToInput(debt.remaining));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [record, setRecord] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await recordDebtPaymentAction({
        debtId: debt.id,
        amount,
        accountId: record ? accountId : "",
      });
      if (!res.ok) {
        setError(res.error.fieldErrors?.amount?.[0] ?? res.error.message);
        return;
      }
      toast.success(
        res.data.settled
          ? `All settled with ${debt.person}! 🎉`
          : `Recorded · ${formatPeso(res.data.remaining)} left`,
      );
      onDone();
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
      <div className="grid gap-1.5">
        <Label htmlFor="p-amount">Amount</Label>
        <Input
          id="p-amount"
          inputMode="decimal"
          autoFocus
          value={amount}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          className="tabular"
        />
        {error && <p className="text-body-sm text-expense">{error}</p>}
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-body-sm">
        <input
          type="checkbox"
          checked={record}
          onChange={(e) => {
            setRecord(e.target.checked);
          }}
          className="size-5 accent-(--accent)"
        />
        {debt.direction === "i_owe" ? "Take it from a wallet" : "Add it to a wallet"}
      </label>
      {record && (
        <NativeSelect
          aria-label="Wallet"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
          }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
