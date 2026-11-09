"use client";

import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { PigWithBubble } from "@/components/pig/pig-with-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPES,
  type AccountType,
  SUGGESTED_ACCOUNTS,
} from "@/modules/ledger/domain/account";
import type { PaydaySchedule } from "@/modules/ledger/domain/settings";
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/modules/ledger/presentation/actions";

type Wallet = {
  key: string;
  name: string;
  type: AccountType;
  openingBalance: string;
  color: string;
};
type PaydayType = PaydaySchedule["type"];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STEPS = 3;

let keySeq = 0;
const nextKey = () => `w${++keySeq}`;

export function OnboardingWizard({ name, pigName }: { name: string; pigName: string }) {
  const mounted = useMounted();
  const [step, setStep] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>(() =>
    SUGGESTED_ACCOUNTS.slice(0, 2).map((a) => ({ ...a, key: nextKey(), openingBalance: "" })),
  );
  const [paydayType, setPaydayType] = useState<PaydayType>("semi_monthly");
  const [days, setDays] = useState<[number, number]>([15, 30]);
  const [monthDay, setMonthDay] = useState(30);
  const [weekday, setWeekday] = useState(5);
  const [income, setIncome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSuggested = (s: (typeof SUGGESTED_ACCOUNTS)[number]) => {
    setWallets((list) =>
      list.some((w) => w.name === s.name)
        ? list.filter((w) => w.name !== s.name)
        : [...list, { ...s, key: nextKey(), openingBalance: "" }],
    );
  };

  const update = (key: string, patch: Partial<Wallet>) => {
    setWallets((list) => list.map((w) => (w.key === key ? { ...w, ...patch } : w)));
  };

  const payday = (): PaydaySchedule => {
    if (paydayType === "semi_monthly") return { type: "semi_monthly", days };
    if (paydayType === "monthly") return { type: "monthly", day: monthDay };
    if (paydayType === "weekly") return { type: "weekly", weekday };
    return { type: "none" };
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboardingAction({
        wallets: wallets.map(({ name: n, type, openingBalance, color }) => ({
          name: n,
          type,
          openingBalance: openingBalance || "0",
          color,
        })),
        payday: payday(),
        monthlyIncome: income,
      });
      {
        setError(res.error.message);
        const walletError = Object.keys(res.error.fieldErrors ?? {}).some((k) =>
          k.startsWith("wallets"),
        );
        if (walletError) setStep(1);
      }
    });
  };

  const skip = () => {
    startTransition(async () => {
      await skipOnboardingAction();
    });
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep((s) => s - 1);
            }}
          >
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS}`} role="img">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-accent" : "bg-border")}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={skip} disabled={pending}>
          Skip
        </Button>
      </div>

      {step === 0 && (
        <section className="grid gap-6 text-center">
          <div className="flex min-h-56 justify-center pt-4">
            {mounted && <PigWithBubble size={160} mood="happy" name={pigName} />}
          </div>
          <div>
            <h1 className="text-h1-sm">
              Hi {name}, I&apos;m {pigName}!
            </h1>
            <p className="mt-2 text-body text-fg-muted">
              I&apos;ll help you track every peso, stick to budgets and save for the things you
              love. Let&apos;s set up in under a minute.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              setStep(1);
            }}
          >
            Let&apos;s go
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-5">
          <div>
            <h1 className="text-h1-sm">Where do you keep your money?</h1>
            <p className="mt-1 text-body-sm text-fg-muted">
              Pick your wallets and how much is in each right now. You can change this later.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested wallets">
            {SUGGESTED_ACCOUNTS.map((s) => {
              const on = wallets.some((w) => w.name === s.name);
              return (
                <button
                  key={s.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    toggleSuggested(s);
                  }}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-body-sm font-medium transition-colors duration-120",
                    on
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  {on && <Check className="size-4" aria-hidden />}
                  {s.name}
                </button>
              );
            })}
          </div>

          <ul className="grid gap-3">
            {wallets.map((w) => (
              <li key={w.key} className="grid gap-2 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: w.color }}
                    aria-hidden
                  />
                  <Input
                    aria-label="Wallet name"
                    value={w.name}
                    maxLength={30}
                    onChange={(e) => {
                      update(w.key, { name: e.target.value });
                    }}
                    className="h-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${w.name || "wallet"}`}
                    disabled={wallets.length === 1}
                    onClick={() => {
                      setWallets((l) => l.filter((x) => x.key !== w.key));
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NativeSelect
                    aria-label="Wallet type"
                    value={w.type}
                    onChange={(e) => {
                      update(w.key, { type: e.target.value as AccountType });
                    }}
                    className="h-10"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACCOUNT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </NativeSelect>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted">
                      ₱
                    </span>
                    <Input
                      aria-label={`${w.name || "Wallet"} current balance`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={w.openingBalance}
                      onChange={(e) => {
                        update(w.key, { openingBalance: e.target.value });
                      }}
                      className="h-10 pl-7 tabular"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="secondary"
            onClick={() => {
              setWallets((l) => [
                ...l,
                { key: nextKey(), name: "", type: "bank", openingBalance: "", color: "#9AA5B1" },
              ]);
            }}
            disabled={wallets.length >= 10}
          >
            <Plus aria-hidden />
            Add another wallet
          </Button>

          {error && <FormAlert>{error}</FormAlert>}

          <Button
            size="lg"
            disabled={wallets.length === 0 || wallets.some((w) => !w.name.trim())}
            onClick={() => {
              setError(null);
              setStep(2);
            }}
          >
            Continue
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-5">
          <div>
            <h1 className="text-h1-sm">When do you get paid?</h1>
            <p className="mt-1 text-body-sm text-fg-muted">
              {pigName} uses this to tell you how much is safe to spend until your next payday.
            </p>
          </div>

          <Segmented
            label="Pay schedule"
            value={paydayType}
            onChange={setPaydayType}
            options={[
              { value: "semi_monthly", label: "Twice" },
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
              { value: "none", label: "Varies" },
            ]}
          />

          {paydayType === "semi_monthly" && (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="grid gap-1.5">
                  <Label htmlFor={`payday-${i}`}>
                    {i === 0 ? "First payday" : "Second payday"}
                  </Label>
                  <NativeSelect
                    id={`payday-${i}`}
                    value={days[i]}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setDays((cur) => (i === 0 ? [d, cur[1]] : [cur[0], d]));
                    }}
                  >
                    {Array.from({ length: 31 }, (_, d) => (
                      <option key={d + 1} value={d + 1}>
                        {d + 1 === 31 ? "End of month" : `Day ${d + 1}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
          )}
          {paydayType === "monthly" && (
            <div className="grid gap-1.5">
              <Label htmlFor="payday-month">Payday</Label>
              <NativeSelect
                id="payday-month"
                value={monthDay}
                onChange={(e) => {
                  setMonthDay(Number(e.target.value));
                }}
              >
                {Array.from({ length: 31 }, (_, d) => (
                  <option key={d + 1} value={d + 1}>
                    {d + 1 === 31 ? "End of month" : `Day ${d + 1}`}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {paydayType === "weekly" && (
            <div className="grid gap-1.5">
              <Label htmlFor="payday-week">Payday</Label>
              <NativeSelect
                id="payday-week"
                value={weekday}
                onChange={(e) => {
                  setWeekday(Number(e.target.value));
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

          <div className="grid gap-1.5">
            <Label htmlFor="income">Monthly take-home pay (optional)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted">
                ₱
              </span>
              <Input
                id="income"
                inputMode="decimal"
                placeholder="25,000"
                value={income}
                onChange={(e) => {
                  setIncome(e.target.value);
                }}
                className="pl-7 tabular"
              />
            </div>
            <p className="text-caption font-normal text-fg-muted">
              Used for budget suggestions. Never shared.
            </p>
          </div>

          {error && <FormAlert>{error}</FormAlert>}

          <Button size="lg" onClick={finish} disabled={pending}>
            {pending ? "Setting up…" : "Start tracking"}
          </Button>
        </section>
      )}
    </div>
  );
}
