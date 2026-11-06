"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/ledger/category-icon";
import { Pig } from "@/components/pig/pig";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/use-mounted";
import type { monthlyRecap } from "@/modules/analytics/application/analytics.use-cases";
import type { Mood } from "@/modules/mascot/domain/mood";

import { useMoneyFormat } from "./use-money-format";

type Recap = Awaited<ReturnType<typeof monthlyRecap>>;

const VERDICT: Record<Recap["verdict"], { mood: Mood; line: string }> = {
  great: { mood: "celebrating", line: "Ang galing! You spent less and saved more. 🎉" },
  good: { mood: "happy", line: "Solid month. Keep the streak going!" },
  over: { mood: "sad", line: "You spent more than you earned. Let's plan next month together." },
  quiet: { mood: "sleeping", line: "Nothing logged this month. Wake me up next time! 💤" },
};

const dayLabel = (ymd: string) =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T12:00:00Z`));

export function RecapCard({
  recap,
  name,
  pigName,
}: {
  recap: Recap;
  name: string;
  pigName: string;
}) {
  const mounted = useMounted();
  const money = useMoneyFormat();
  const v = VERDICT[recap.verdict];
  const monthName = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${recap.start}T12:00:00Z`));

  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: "Spent",
      value: money.full(recap.totals.expense),
      ...(recap.spendChange !== null
        ? { hint: `${recap.spendChange > 0 ? "+" : ""}${recap.spendChange}% vs last month` }
        : {}),
    },
    { label: "Earned", value: money.full(recap.totals.income) },
    {
      label: "Saved",
      value: money.full(recap.saved),
      ...(recap.savingsRate !== null ? { hint: `${recap.savingsRate}% of income` } : {}),
    },
    { label: "No-spend days", value: String(recap.noSpendDays) },
  ];

  const share = async () => {
    const text = `My ${monthName} with ${pigName} 🐷\nSpent ${money.full(recap.totals.expense)} · Saved ${money.full(recap.saved)}${recap.topCategory ? ` · Top: ${recap.topCategory.name}` : ""}\n${recap.noSpendDays} no-spend days!`;
    try {
      if (typeof navigator.share === "function")
        await navigator.share({ title: "Oink recap", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Recap copied to clipboard");
      }
    } catch {
      /* share cancelled */
    }
  };

  return (
    <article className="grid gap-5 overflow-hidden rounded-xl border border-border bg-surface p-6 text-center">
      <header>
        <p className="text-caption tracking-wide text-fg-muted uppercase">
          Oink recap{recap.complete ? "" : " · so far"}
        </p>
        <h1 className="font-brand text-h1">{monthName}</h1>
      </header>
      <div className="flex h-36 justify-center pt-4">
        {mounted && <Pig mood={v.mood} size={120} interactive={false} name={pigName} />}
      </div>
      <p className="text-body">
        {name}, {v.line}
      </p>
      <dl className="grid grid-cols-2 gap-3 text-left">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-surface-2 p-3">
            <dt className="text-caption text-fg-muted">{s.label}</dt>
            <dd className="text-h3 tabular">{s.value}</dd>
            {s.hint && <dd className="text-caption text-fg-muted">{s.hint}</dd>}
          </div>
        ))}
      </dl>
      <ul className="grid gap-3 text-left text-body-sm">
        {recap.topCategory && (
          <li className="flex items-center gap-3">
            <CategoryIcon icon={recap.topCategory.icon} color={recap.topCategory.color} size="sm" />
            <span>
              Most went to <strong>{recap.topCategory.name}</strong> ·{" "}
              {money.full(recap.topCategory.total)}
            </span>
          </li>
        )}
        {recap.biggestDay && recap.biggestDay.expense > 0 && (
          <li>
            📅 Biggest day: <strong>{dayLabel(recap.biggestDay.day)}</strong> ·{" "}
            {money.full(recap.biggestDay.expense)}
          </li>
        )}
        {recap.biggestExpense && (
          <li>
            💸 Biggest buy:{" "}
            <strong>{recap.biggestExpense.note || recap.biggestExpense.categoryName}</strong> ·{" "}
            {money.full(recap.biggestExpense.amount)}
          </li>
        )}
        {recap.tags.length > 0 && (
          <li>🏷️ Top tags: {recap.tags.map((t) => `#${t.tag}`).join(", ")}</li>
        )}
      </ul>
      <Button onClick={() => void share()} variant="secondary">
        <Share2 aria-hidden />
        Share recap
      </Button>
    </article>
  );
}
