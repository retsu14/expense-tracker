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
import { SpeechSlot, useSpeech } from "./pig-with-bubble";

const GLOW = {
  thriving: "from-pig/30",
  healthy: "from-pig/15",
  thin: "from-warning/15",
  famished: "from-expense/15",
} as const;

const HALO = {
  thriving: "bg-pig/35",
  healthy: "bg-pig/20",
  thin: "bg-warning/15",
  famished: "bg-expense/15",
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
  const speech = useSpeech();

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
        "@container relative overflow-hidden rounded-xl border border-border bg-surface bg-linear-to-br to-surface to-60%",
        GLOW[level],
        className,
      )}
    >
      <div className="grid gap-4 p-4 md:p-5">
        <div className="grid items-center gap-x-3 gap-y-1 text-center @3xs:grid-cols-[auto_minmax(0,1fr)] @3xs:text-left @sm:gap-x-5">
          <div className="relative flex size-28 items-end justify-center justify-self-center @3xs:size-24 @xs:size-28 @sm:size-36">
            <span
              aria-hidden
              className={cn("absolute inset-x-2 bottom-1 h-3/4 rounded-full blur-2xl", HALO[level])}
            />
            {mounted ? (
              <Pig
                size={136}
                listen
                name={pigName}
                health={level}
                onSay={speech.say}
                className="relative size-28! @3xs:size-24! @xs:size-28! @sm:size-36!"
              />
            ) : null}
          </div>
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 @3xs:justify-between">
              <p className="text-caption tracking-wide text-fg-muted uppercase">
                {pigName}&apos;s health
              </p>
              <p className="text-caption text-fg-muted tabular">
                <span className="font-semibold text-fg">{report.score}</span>/100
              </p>
            </div>
            <h2 id="pig-health" className="font-brand text-h2 leading-none @sm:text-h1">
              {HEALTH_LABEL[level]}
            </h2>
            <div
              role="meter"
              aria-label={`${pigName}'s health`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={report.score}
              className="h-2 overflow-hidden rounded-full bg-bg/60"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out-soft",
                  BAR[level],
                )}
                style={{ width: `${String(Math.max(4, report.score))}%` }}
              />
            </div>
            <SpeechSlot
              message={speech.message}
              onDismiss={speech.dismiss}
              tail="auto"
              className="min-h-14 items-start justify-center @3xs:justify-start"
            />
          </div>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {report.reasons.map((r) => (
            <li
              key={r.text}
              className="inline-flex items-center gap-1.5 rounded-full bg-bg/45 py-1 pr-3 pl-2 text-caption font-medium"
            >
              {r.good ? (
                <CircleCheck className="size-3.5 shrink-0 text-income" aria-label="Good" />
              ) : (
                <CircleAlert
                  className="size-3.5 shrink-0 text-warning"
                  aria-label="Needs attention"
                />
              )}
              <span className="min-w-0">{r.text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/assistant"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-body-sm font-medium transition-colors duration-120 hover:bg-surface-2"
        >
          <MessageCircleHeart className="size-4 text-pig" aria-hidden />
          Ask {pigName}
          <span className="hidden @xs:inline">about your money</span>
        </Link>
      </div>
    </section>
  );
}
