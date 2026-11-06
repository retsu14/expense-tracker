import { ChevronLeft, ChevronRight, List } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/ledger/amount";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { monthCalendar } from "@/modules/analytics/application/analytics.use-cases";
import { requireUser } from "@/modules/identity/presentation/dal";
import { analyticsDeps } from "@/shared/container";
import { addDays } from "@/shared/kernel/time";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({ searchParams }: PageProps<"/activity/calendar">) {
  const user = await requireUser();
  const { m } = await searchParams;
  const cal = await monthCalendar(analyticsDeps(), user.id, typeof m === "string" ? m : null);
  const byDay = new Map(cal.days.map((d) => [d.day, d]));
  const lead = new Date(`${cal.start}T00:00:00Z`).getUTCDay();
  const days: string[] = [];
  for (let d = cal.start; d <= cal.end; d = addDays(d, 1)) days.push(d);
  const title = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${cal.start}T12:00:00Z`));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Tap a day to see its transactions."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/activity">
              <List aria-hidden />
              List
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="secondary" size="icon" aria-label="Previous month">
          <Link href={`/activity/calendar?m=${cal.prev}`} scroll={false}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <div className="text-center">
          <h2 className="text-h2">{title}</h2>
          <p className="text-caption text-fg-muted">
            Spent {formatPeso(cal.totals.expense)} · Earned {formatPeso(cal.totals.income)}
          </p>
        </div>
        <Button asChild variant="secondary" size="icon" aria-label="Next month">
          <Link href={`/activity/calendar?m=${cal.next}`} scroll={false}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-caption text-fg-muted" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <li key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((d) => {
          const v = byDay.get(d);
          const future = d > cal.today;
          return (
            <li key={d}>
              <Link
                href={`/activity?period=custom&from=${d}&to=${d}`}
                aria-label={`${d}: spent ${formatPeso(v?.expense ?? 0)}, earned ${formatPeso(v?.income ?? 0)}`}
                className={cn(
                  "flex aspect-square min-h-14 flex-col rounded-md border p-1 text-left transition-colors duration-120 hover:border-fg-muted sm:aspect-auto sm:min-h-24 sm:p-2",
                  d === cal.today ? "border-accent" : "border-border",
                  future ? "bg-bg opacity-50" : "bg-surface",
                )}
              >
                <span className="text-caption font-semibold">{Number(d.slice(8))}</span>
                <span className="mt-auto grid text-[10px] leading-tight sm:text-caption">
                  {v && v.expense > 0 && <Amount value={v.expense} compact className="truncate" />}
                  {v && v.income > 0 && (
                    <Amount value={v.income} kind="income" compact className="truncate" />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
