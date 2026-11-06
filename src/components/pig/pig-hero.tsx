"use client";

import { CircleAlert, CircleCheck, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { HEALTH_LABEL, type HealthReport } from "@/modules/mascot/domain/health";
import { deriveMood, isNight } from "@/modules/mascot/domain/mood";
import { useMascotStore } from "@/stores/mascot-store";

import { Pig } from "./pig";

const GLOW = {
  thriving: "from-pig/30",
  healthy: "from-pig/15",
  thin: "from-warning/15",
  famished: "from-expense/15",
} as const;

const BAR = {
  thriving: "bg-income",
  healthy: "bg-income",
  thin: "bg-warning",
  famished: "bg-expense",
} as const;

function greeting(report: HealthReport, hour: number, name: string, tight: boolean) {
  switch (report.level) {
    case "famished":
      return `I'm so hungry, ${name}… let's save a bit? 🥺`;
    case "thin":
      return `My tummy's rumbling, ${name}. Let's slow down?`;
    case "thriving":
      return `I'm feeling chubby and happy! Great job, ${name}! 💗`;
    case "healthy":
      if (tight) return `Heads up ${name}, the budget is getting tight!`;
      if (isNight(hour)) return `Up late, ${name}? I'm sleepy…`;
      return hour < 12
        ? `Good morning, ${name}!`
        : hour < 18
          ? `Good afternoon, ${name}!`
          : `Good evening, ${name}!`;
  }
}

export function PigHero({
  name,
  pigName,
  report,
  budgetUsedPct,
  alertPct,
  className,
}: {
  name: string;
  pigName: string;
  report: HealthReport;
  budgetUsedPct: number | null;
  alertPct: number;
  className?: string;
}) {
  const mounted = useMounted();
  const setMood = useMascotStore((s) => s.setMood);
  const say = useMascotStore((s) => s.say);
  const level = report.level;

  useEffect(() => {
    const hour = new Date().getHours();
    setMood(deriveMood({ hour, budgetUsedPct, alertPct, health: level }));
    const t = setTimeout(() => {
      say(
        greeting(
          report,
          hour,
          name.split(" ")[0] ?? name,
          budgetUsedPct !== null && budgetUsedPct >= alertPct,
        ),
      );
    }, 700);
    return () => {
      clearTimeout(t);
    };
  }, [setMood, say, name, report, level, budgetUsedPct, alertPct]);

  return (
    <section
      aria-labelledby="pig-health"
      className={cn(
        "@container relative overflow-hidden rounded-xl border border-border bg-surface bg-linear-to-b to-surface to-70%",
        GLOW[level],
        className,
      )}
    >
      <div className="grid items-center gap-x-4 gap-y-2 p-4 pt-14 md:p-6 md:pt-14 @md:grid-cols-[auto_1fr] @md:pt-12">
        <div className="flex justify-center">
          {mounted ? (
            <Pig size={136} listen name={pigName} health={level} />
          ) : (
            <div className="size-34" aria-hidden />
          )}
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="text-center @md:text-left">
            <p className="text-caption tracking-wide text-fg-muted uppercase">
              {pigName}&apos;s health
            </p>
            <h2 id="pig-health" className="font-brand text-h2">
              {HEALTH_LABEL[level]}
            </h2>
          </div>
          <div className="grid gap-1">
            <div
              role="meter"
              aria-label={`${pigName}'s health`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={report.score}
              className="h-2.5 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out-soft",
                  BAR[level],
                )}
                style={{ width: `${String(Math.max(4, report.score))}%` }}
              />
            </div>
            <p className="text-right text-caption text-fg-muted tabular">{report.score}/100</p>
          </div>
          <ul className="grid gap-1.5 text-body-sm">
            {report.reasons.map((r) => (
              <li key={r.text} className="flex items-start gap-2">
                {r.good ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-income" aria-label="Good" />
                ) : (
                  <CircleAlert
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-label="Needs attention"
                  />
                )}
                <span className="min-w-0">{r.text}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/assistant"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-body-sm font-medium transition-colors duration-120 hover:bg-surface-2 @md:justify-self-start"
          >
            <MessageCircleHeart className="size-4 text-pig" aria-hidden />
            Ask {pigName}
          </Link>
        </div>
      </div>
    </section>
  );
}
