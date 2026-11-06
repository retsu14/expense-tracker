"use client";

import { CalendarClock, Check, Pause, Pencil, Play, Plus, SkipForward, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Amount } from "@/components/ledger/amount";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { centavosToInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  billOccurrences,
  listRecurring,
} from "@/modules/planning/application/planning.use-cases";
import type { Schedule } from "@/modules/planning/domain/recurring";
import {
  createRecurringAction,
  deleteRecurringAction,
  markPaidAction,
  setRecurringActiveAction,
  skipOccurrenceAction,
  updateRecurringAction,
} from "@/modules/planning/presentation/actions";

type Occurrence = Awaited<ReturnType<typeof billOccurrences>>[number];
type RecurringItem = Awaited<ReturnType<typeof listRecurring>>[number];
type Option = { id: string; name: string };

const STATUS_LABEL: Record<Occurrence["status"], string> = {
  paid: "Paid",
  skipped: "Skipped",
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};

const dueLabel = (o: Occurrence) => {
  if (o.status === "paid" || o.status === "skipped") return STATUS_LABEL[o.status];
  if (o.daysUntil === 0) return "Due today";
  if (o.daysUntil === 1) return "Due tomorrow";
  if (o.daysUntil < 0) return `${-o.daysUntil} ${o.daysUntil === -1 ? "day" : "days"} overdue`;
  return `In ${o.daysUntil} days`;
};

const fmtDate = (ymd: string) =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T12:00:00Z`));

export function BillsView({
  occurrences,
  recurring,
  accounts,
  categories,
  today,
}: {
  today: string;
  occurrences: Occurrence[];
  recurring: RecurringItem[];
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  const [editing, setEditing] = useState<RecurringItem | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const open = occurrences.filter((o) => o.status !== "paid" && o.status !== "skipped");
  const done = occurrences.filter((o) => o.status === "paid" || o.status === "skipped");

  const act = (o: Occurrence, kind: "paid" | "skip") => {
    startTransition(async () => {
      const input = { recurringId: o.recurringId, dueDate: o.due };
      const res = kind === "paid" ? await markPaidAction(input) : await skipOccurrenceAction(input);
      if (res.ok) toast.success(kind === "paid" ? `${o.name} marked as paid` : `${o.name} skipped`);
      else toast.error(res.error.message);
    });
  };

  const toggle = (r: RecurringItem) => {
    startTransition(async () => {
      const res = await setRecurringActiveAction(r.id, !r.active);
      if (res.ok) toast.success(r.active ? `${r.name} paused` : `${r.name} resumed`);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <section className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-h2">Upcoming</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditing("new");
            }}
          >
            <Plus aria-hidden />
            Add bill
          </Button>
        </div>
        {open.length === 0 ? (
          <EmptyState
            title={recurring.length ? "All caught up!" : "No bills yet"}
            description={
              recurring.length
                ? "Nothing due in the next 31 days."
                : "Add rent, Meralco, internet or subscriptions and get reminded before they're due."
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {open.map((o) => (
              <li
                key={`${o.recurringId}:${o.due}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    o.status === "overdue"
                      ? "bg-expense/15 text-expense"
                      : o.status === "due_soon"
                        ? "bg-warning/15 text-warning"
                        : "bg-surface-2 text-fg-muted",
                  )}
                >
                  <CalendarClock className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.name}</p>
                  <p
                    className={cn(
                      "text-caption",
                      o.status === "overdue"
                        ? "text-expense"
                        : o.status === "due_soon"
                          ? "text-warning"
                          : "text-fg-muted",
                    )}
                  >
                    {dueLabel(o)} · {fmtDate(o.due)} · {o.accountName}
                    {o.autoPost && " · auto"}
                  </p>
                </div>
                <Amount value={o.amount} kind={o.kind} sign className="font-semibold" />
                {!o.autoPost && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={pending}
                      onClick={() => {
                        act(o, "paid");
                      }}
                    >
                      <Check aria-hidden />
                      {o.kind === "income" ? "Received" : "Mark paid"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Skip ${o.name} on ${o.due}`}
                      disabled={pending}
                      onClick={() => {
                        act(o, "skip");
                      }}
                    >
                      <SkipForward aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {done.length > 0 && (
          <p className="text-caption text-fg-muted">
            Recently done:{" "}
            {done.map((o) => `${o.name} (${STATUS_LABEL[o.status].toLowerCase()})`).join(", ")}
          </p>
        )}
      </section>

      {recurring.length > 0 && (
        <Card className="p-0 md:p-0">
          <CardHeader className="mb-0 px-4 pt-4 md:px-5 md:pt-5">
            <CardTitle>Bills & recurring</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {recurring.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 md:px-5",
                  !r.active && "opacity-55",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.name}
                    {!r.active && <span className="ml-2 text-caption text-fg-muted">Paused</span>}
                  </p>
                  <p className="text-caption font-normal text-fg-muted">
                    {r.scheduleLabel}
                    {r.autoPost ? " · records automatically" : ` · remind ${r.remindDays}d before`}
                  </p>
                </div>
                <Amount value={r.amount} kind={r.kind} sign className="font-semibold" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${r.name}`}
                  onClick={() => {
                    setEditing(r);
                  }}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={r.active ? `Pause ${r.name}` : `Resume ${r.name}`}
                  onClick={() => {
                    toggle(r);
                  }}
                >
                  {r.active ? <Pause aria-hidden /> : <Play aria-hidden />}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={editing === "new" ? "Add bill or recurring" : "Edit recurring"}
      >
        {editing && (
          <RecurringForm
            item={editing === "new" ? null : editing}
            accounts={accounts}
            categories={categories}
            today={today}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function DaySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (d: number) => void;
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={(e) => {
        onChange(Number(e.target.value));
      }}
    >
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          {i + 1 === 31 ? "End of month" : `Day ${i + 1}`}
        </option>
      ))}
    </NativeSelect>
  );
}

function RecurringForm({
  item,
  accounts,
  categories,
  today,
  onDone,
}: {
  today: string;
  item: RecurringItem | null;
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"expense" | "income">(item?.kind ?? "expense");
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item ? centavosToInput(item.amount) : "");
  const [accountId, setAccountId] = useState(item?.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [schedule, setSchedule] = useState<Schedule>(
    item?.schedule ?? { type: "monthly", day: 15 },
  );
  const [autoPost, setAutoPost] = useState(item?.autoPost ?? false);
  const [remindDays, setRemindDays] = useState(item?.remindDays ?? 3);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cats = categories.filter((c) => c.kind === kind);
  const category = cats.some((c) => c.id === categoryId) ? categoryId : (cats[0]?.id ?? "");

  const changeType = (type: Schedule["type"]) => {
    setSchedule(
      type === "monthly"
        ? { type, day: 15 }
        : type === "semi_monthly"
          ? { type, days: [15, 30] }
          : type === "weekly"
            ? { type, weekday: 5 }
            : { type, month: 1, day: 1 },
    );
  };

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      const input = {
        kind,
        name,
        amount,
        accountId,
        categoryId: category,
        schedule,
        startDate: item?.startDate ?? today,
        autoPost,
        remindDays,
      };
      const res = item
        ? await updateRecurringAction(item.id, input)
        : await createRecurringAction(input);
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      toast.success(item ? "Saved" : `${name} added`);
      onDone();
    });
  };

  const remove = () => {
    if (!item) return;
    startTransition(async () => {
      const res = await deleteRecurringAction(item.id);
      if (res.ok) {
        toast.success(`${item.name} removed`);
        onDone();
      }
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
        label="Type"
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: "Bill / expense" },
          { value: "income", label: "Income" },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="r-name">Name</Label>
          <Input
            id="r-name"
            value={name}
            maxLength={40}
            autoFocus
            placeholder={kind === "income" ? "Salary" : "Meralco"}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          {errors.name && <p className="text-body-sm text-expense">{errors.name[0]}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-amount">Amount</Label>
          <Input
            id="r-amount"
            inputMode="decimal"
            placeholder="2,500"
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
          <Label htmlFor="r-cat">Category</Label>
          <NativeSelect
            id="r-cat"
            value={category}
            onChange={(e) => {
              setCategoryId(e.target.value);
            }}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-acct">Wallet</Label>
          <NativeSelect
            id="r-acct"
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
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="r-type">Repeats</Label>
        <NativeSelect
          id="r-type"
          value={schedule.type}
          onChange={(e) => {
            changeType(e.target.value as Schedule["type"]);
          }}
        >
          <option value="monthly">Every month</option>
          <option value="semi_monthly">Twice a month</option>
          <option value="weekly">Every week</option>
          <option value="yearly">Every year</option>
        </NativeSelect>
      </div>
      {schedule.type === "monthly" && (
        <div className="grid gap-1.5">
          <Label htmlFor="r-day">On</Label>
          <DaySelect
            id="r-day"
            value={schedule.day}
            onChange={(day) => {
              setSchedule({ type: "monthly", day });
            }}
          />
        </div>
      )}
      {schedule.type === "semi_monthly" && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="grid gap-1.5">
              <Label htmlFor={`r-sd-${i}`}>{i === 0 ? "First" : "Second"}</Label>
              <DaySelect
                id={`r-sd-${i}`}
                value={schedule.days[i] ?? 15}
                onChange={(d) => {
                  setSchedule({
                    type: "semi_monthly",
                    days: i === 0 ? [d, schedule.days[1]] : [schedule.days[0], d],
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}
      {schedule.type === "weekly" && (
        <div className="grid gap-1.5">
          <Label htmlFor="r-wd">On</Label>
          <NativeSelect
            id="r-wd"
            value={schedule.weekday}
            onChange={(e) => {
              setSchedule({ type: "weekly", weekday: Number(e.target.value) });
            }}
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {schedule.type === "yearly" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="r-ym">Month</Label>
            <NativeSelect
              id="r-ym"
              value={schedule.month}
              onChange={(e) => {
                setSchedule({ ...schedule, month: Number(e.target.value) });
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-yd">Day</Label>
            <DaySelect
              id="r-yd"
              value={schedule.day}
              onChange={(day) => {
                setSchedule({ ...schedule, day });
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="r-auto">Record automatically</Label>
          <p className="text-caption font-normal text-fg-muted">
            {kind === "income"
              ? "Great for a fixed salary."
              : "For fixed amounts like subscriptions."}{" "}
            Otherwise you&apos;ll get a reminder to mark it paid.
          </p>
        </div>
        <Switch id="r-auto" checked={autoPost} onCheckedChange={setAutoPost} />
      </div>
      {!autoPost && (
        <div className="grid gap-1.5">
          <Label htmlFor="r-remind">Remind me</Label>
          <NativeSelect
            id="r-remind"
            value={remindDays}
            onChange={(e) => {
              setRemindDays(Number(e.target.value));
            }}
          >
            {[0, 1, 2, 3, 5, 7].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "On the day" : `${d} ${d === 1 ? "day" : "days"} before`}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="flex gap-2">
        {item && (
          <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add"}
        </Button>
      </div>
    </form>
  );
}
