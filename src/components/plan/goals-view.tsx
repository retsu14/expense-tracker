"use client";

import { Archive, Minus, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Amount } from "@/components/ledger/amount";
import { ICONS } from "@/components/ledger/category-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Segmented } from "@/components/ui/segmented";
import { centavosToInput, formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryIcon,
} from "@/modules/ledger/domain/category";
import type { GoalStatus, GoalWithProgress } from "@/modules/planning/domain/goal";
import {
  contributeAction,
  createGoalAction,
  deleteGoalAction,
  setGoalStatusAction,
  updateGoalAction,
} from "@/modules/planning/presentation/actions";
import { useMascotStore } from "@/stores/mascot-store";

import { GoalPig } from "./goal-pig";

const GOAL_ICONS: CategoryIcon[] = [
  "laptop",
  "plane",
  "home",
  "smartphone",
  "graduation-cap",
  "gift",
  "heart-pulse",
  "baby",
  "paw-print",
  "party-popper",
  "wallet",
  "coins",
];

const fmtDate = (ymd: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T12:00:00Z`));

export function GoalsView({ goals }: { goals: GoalWithProgress[] }) {
  const [editing, setEditing] = useState<GoalWithProgress | "new" | null>(null);
  const [moving, setMoving] = useState<{
    goal: GoalWithProgress;
    direction: "add" | "withdraw";
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const active = goals.filter((g) => g.status === "active" || g.status === "paused");
  const done = goals.filter((g) => g.status === "completed");
  const totalSaved = active.reduce((s, g) => s + g.saved, 0);

  const setStatus = (g: GoalWithProgress, status: GoalStatus) => {
    startTransition(async () => {
      const res = await setGoalStatusAction(g.id, status);
      if (res.ok)
        toast.success(
          `${g.name} ${status === "archived" ? "archived" : status === "paused" ? "paused" : "resumed"}`,
        );
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-fg-muted">
          Saved across goals: <Amount value={totalSaved} className="font-semibold text-fg" />
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing("new");
          }}
        >
          <Plus aria-hidden />
          New goal
        </Button>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <EmptyState
          title="What are you saving for?"
          description="A new phone, a trip to Siargao, an emergency fund — set a goal and watch your piggy bank fill up."
          action={
            <Button
              onClick={() => {
                setEditing("new");
              }}
            >
              Create a goal
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((g) => (
            <li key={g.id}>
              <Card className={cn("grid h-full gap-4", g.status === "paused" && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <GoalPig pct={g.pct} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-h3">{g.name}</p>
                    <p className="text-caption font-normal text-fg-muted">
                      {g.status === "paused"
                        ? "Paused"
                        : g.deadline
                          ? `By ${fmtDate(g.deadline)}`
                          : "No deadline"}
                    </p>
                  </div>
                  <GoalMenu
                    goal={g}
                    disabled={pending}
                    onEdit={() => {
                      setEditing(g);
                    }}
                    onStatus={(s) => {
                      setStatus(g, s);
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <ProgressBar value={g.pct} status="goal" label={`${g.name} progress`} />
                  <div className="flex items-baseline justify-between text-body-sm">
                    <span>
                      <Amount value={g.saved} className="font-semibold" />{" "}
                      <span className="text-fg-muted">of {formatPeso(g.target)}</span>
                    </span>
                    <span className="font-medium text-fg-muted">{Math.floor(g.pct)}%</span>
                  </div>
                  {g.monthlyNeeded !== null && (
                    <p className="text-caption text-fg-muted">
                      Save {formatPeso(g.monthlyNeeded)}/month to make it
                      {g.daysLeft !== null && g.daysLeft < 0 && " — deadline passed"}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    disabled={g.status !== "active"}
                    onClick={() => {
                      setMoving({ goal: g, direction: "add" });
                    }}
                  >
                    <Plus aria-hidden />
                    Add money
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={g.saved === 0}
                    onClick={() => {
                      setMoving({ goal: g, direction: "withdraw" });
                    }}
                  >
                    <Minus aria-hidden />
                    Withdraw
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-h3 text-fg-muted">Completed 🎉</h2>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {done.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 max-xs:gap-2 max-xs:px-3"
              >
                <GoalPig pct={100} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.name}</span>
                  <Amount value={g.saved} className="text-body-sm font-semibold text-fg-muted" />
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Archive ${g.name}`}
                  disabled={pending}
                  onClick={() => {
                    setStatus(g, "archived");
                  }}
                >
                  <Archive aria-hidden />
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
        title={editing === "new" ? "New goal" : "Edit goal"}
      >
        {editing && (
          <GoalForm
            goal={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={moving !== null}
        onOpenChange={(o) => {
          if (!o) setMoving(null);
        }}
        title={moving?.direction === "withdraw" ? "Withdraw from goal" : "Add to goal"}
        description={
          moving ? `${moving.goal.name} · ${formatPeso(moving.goal.saved)} saved` : undefined
        }
      >
        {moving && (
          <MoveMoney
            goal={moving.goal}
            initial={moving.direction}
            onDone={() => {
              setMoving(null);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

function GoalMenu({
  goal,
  disabled,
  onEdit,
  onStatus,
}: {
  goal: GoalWithProgress;
  disabled: boolean;
  onEdit: () => void;
  onStatus: (s: GoalStatus) => void;
}) {
  const item =
    "flex h-10 cursor-pointer items-center gap-2 rounded-sm px-3 text-body-sm outline-none data-highlighted:bg-surface-2";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${goal.name} options`} disabled={disabled}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-40 rounded-md border border-border bg-surface p-1 shadow-xl"
        >
          <DropdownMenu.Item className={item} onSelect={onEdit}>
            <Pencil className="size-4" aria-hidden /> Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={() => {
              onStatus(goal.status === "paused" ? "active" : "paused");
            }}
          >
            {goal.status === "paused" ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )}
            {goal.status === "paused" ? "Resume" : "Pause"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={() => {
              onStatus("archived");
            }}
          >
            <Archive className="size-4" aria-hidden /> Archive
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MoveMoney({
  goal,
  initial,
  onDone,
}: {
  goal: GoalWithProgress;
  initial: "add" | "withdraw";
  onDone: () => void;
}) {
  const [direction, setDirection] = useState(initial);
  const [amount, setAmount] = useState(
    goal.monthlyNeeded && initial === "add" ? centavosToInput(goal.monthlyNeeded) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await contributeAction({ goalId: goal.id, amount, direction });
      if (!res.ok) {
        setError(res.error.fieldErrors?.amount?.[0] ?? res.error.message);
        return;
      }
      const { setMood, say } = useMascotStore.getState();
      if (res.data.completed) {
        setMood("celebrating");
        say(`You did it! ${goal.name} reached! 🎉`);
        toast.success(`Goal reached: ${goal.name}! 🎉`);
      } else if (direction === "add") {
        setMood("munch");
        say("Into the piggy bank!");
        toast.success(`Saved to ${goal.name}`);
      } else toast.success(`Withdrew from ${goal.name}`);
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
      <Segmented
        label="Direction"
        value={direction}
        onChange={setDirection}
        options={[
          { value: "add", label: "Add" },
          { value: "withdraw", label: "Withdraw" },
        ]}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="g-move">Amount</Label>
        <Input
          id="g-move"
          inputMode="decimal"
          autoFocus
          placeholder="1,000"
          value={amount}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          className="tabular"
        />
        {error && <p className="text-body-sm text-expense">{error}</p>}
        <p className="text-caption font-normal text-fg-muted">
          This tracks money you set aside. Your wallet balances don&apos;t change.
        </p>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : direction === "add" ? "Add to goal" : "Withdraw"}
      </Button>
    </form>
  );
}

function GoalForm({ goal, onDone }: { goal: GoalWithProgress | null; onDone: () => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? centavosToInput(goal.target) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [icon, setIcon] = useState<CategoryIcon>(
    (goal?.icon as CategoryIcon | undefined) ?? "wallet",
  );
  const [color, setColor] = useState<string>(goal?.color ?? CATEGORY_COLORS[6]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      const input = { name, target, deadline, icon, color };
      const res = goal ? await updateGoalAction(goal.id, input) : await createGoalAction(input);
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      toast.success(goal ? "Goal updated" : `Goal "${name}" created`);
      onDone();
    });
  };

  const remove = () => {
    if (!goal) return;
    startTransition(async () => {
      const res = await deleteGoalAction(goal.id);
      if (res.ok) {
        toast.success("Goal deleted");
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
      <div className="grid gap-1.5">
        <Label htmlFor="g-name">Goal</Label>
        <Input
          id="g-name"
          value={name}
          maxLength={40}
          autoFocus
          placeholder="New laptop"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        {errors.name && <p className="text-body-sm text-expense">{errors.name[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="g-target">Target</Label>
          <Input
            id="g-target"
            inputMode="decimal"
            placeholder="60,000"
            value={target}
            aria-invalid={errors.target ? true : undefined}
            onChange={(e) => {
              setTarget(e.target.value);
            }}
            className="tabular"
          />
          {errors.target && <p className="text-body-sm text-expense">{errors.target[0]}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="g-deadline">Deadline (optional)</Label>
          <Input
            id="g-deadline"
            type="date"
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value);
            }}
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-body-sm font-medium">Icon</legend>
        <div className="grid grid-cols-6 gap-2">
          {GOAL_ICONS.filter((i) => CATEGORY_ICONS.includes(i)).map((i) => {
            const Icon = ICONS[i];
            return (
              <button
                key={i}
                type="button"
                aria-label={i.replace(/-/g, " ")}
                aria-pressed={icon === i}
                onClick={() => {
                  setIcon(i);
                }}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-md border",
                  icon === i
                    ? "border-accent bg-surface-2"
                    : "border-transparent hover:bg-surface-2",
                )}
              >
                {Icon && <Icon className="size-5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-body-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => {
                setColor(c);
              }}
              className={cn(
                "size-10 cursor-pointer rounded-full border-2",
                color === c ? "border-fg" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        {goal && (
          <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : goal ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
