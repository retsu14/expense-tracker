"use client";

import { CircleAlert, CircleCheck, MessageCircleHeart, Trophy } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatPeso } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { HEALTH_LABEL, type HealthReport } from "@/modules/mascot/domain/health";
import { type Milestone, MILESTONES, type Outfit } from "@/modules/mascot/domain/milestones";
import { deriveMood, isNight } from "@/modules/mascot/domain/mood";
import { celebratedAction } from "@/modules/mascot/presentation/actions";
import { useMascotStore } from "@/stores/mascot-store";
import { useSettingsStore } from "@/stores/settings-store";

import { playOink } from "./oink-sound";
import { OutfitArt } from "./pig-outfits";

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

export type HeroMascot = {
  outfit: Outfit | null;
  pending: Milestone | null;
  next: { milestone: Milestone; remaining: number; pct: number } | null;
};

const before = (m: Milestone) => {
  const i = MILESTONES.findIndex((x) => x.id === m.id);
  return i > 0 ? (MILESTONES[i - 1]?.id ?? null) : null;
};

export function PigHero({
  name,
  pigName,
  report,
  budgetUsedPct,
  alertPct,
  mascot,
  className,
}: {
  name: string;
  pigName: string;
  report: HealthReport;
  budgetUsedPct: number | null;
  alertPct: number;
  mascot: HeroMascot;
  className?: string;
}) {
  const mounted = useMounted();
  const setMood = useMascotStore((s) => s.setMood);
  const say = useMascotStore((s) => s.say);
  const level = report.level;
  const speech = useSpeech();
  const speak = speech.say;
  const reduced = useReducedMotion() ?? false;
  const { pending, next } = mascot;
  const [shown, setShown] = useState(pending ? before(pending) : mascot.outfit);
  const [burst, setBurst] = useState(0);
  const [badge, setBadge] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!mounted || !pending) return;
    const [drop, wear, cheer]: [number, number, number] = reduced ? [0, 0, 0] : [900, 2150, 2700];
    const timers = [
      setTimeout(() => {
        setBurst(1);
      }, drop),
      setTimeout(() => {
        setShown(pending.id);
      }, wear),
      setTimeout(() => {
        setBadge(pending);
        speak(pending.line);
        const { haptics, sound } = useSettingsStore.getState();
        if (haptics && "vibrate" in navigator) navigator.vibrate([20, 60, 30]);
        if (sound) playOink();
        void celebratedAction();
      }, cheer),
      setTimeout(() => {
        setBadge(null);
      }, cheer + 5000),
    ];
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [mounted, pending, reduced, speak]);

  useEffect(() => {
    const hour = new Date().getHours();
    setMood(deriveMood({ hour, budgetUsedPct, alertPct, health: level }));
    if (pending) return;
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
  }, [setMood, say, name, report, level, budgetUsedPct, alertPct, pending]);

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
                outfit={shown}
                burst={burst}
                onSay={speech.say}
                className="relative size-28! @3xs:size-24! @xs:size-28! @sm:size-36!"
              />
            ) : null}
            {next && next.pct >= 90 && !pending && (
              <m.span
                aria-hidden
                className="absolute -top-1 -right-3 w-10 opacity-40 grayscale"
                animate={reduced ? {} : { y: [0, -5, 0], rotate: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
              >
                <OutfitArt outfit={next.milestone.id} className="w-full" />
              </m.span>
            )}
          </div>
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 @3xs:justify-between">
              <p className="eyebrow">{pigName}&apos;s health</p>
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

        <Link
          href="/settings#badges"
          className="group grid gap-1 rounded-md text-caption text-fg-muted"
        >
          {next ? (
            <>
              <span className="flex justify-between gap-2">
                <span className="truncate">
                  Next: <span className="font-medium text-fg">{next.milestone.name}</span>
                </span>
                <span className="shrink-0 tabular group-hover:text-fg">
                  {formatPeso(next.remaining, { whole: true })} to go
                </span>
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-bg/60">
                <span
                  className="block h-full rounded-full bg-pig transition-[width] duration-500"
                  style={{ width: `${String(Math.max(3, next.pct))}%` }}
                />
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-fg">
              <Trophy className="size-3.5 text-warning" aria-hidden /> Every badge earned
            </span>
          )}
        </Link>

        <AnimatePresence>
          {badge && (
            <m.p
              role="status"
              initial={{ opacity: 0, scale: 0.4, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
              className="shine inline-flex items-center gap-2 justify-self-center rounded-full bg-warning/20 py-1.5 pr-4 pl-2 text-body-sm font-semibold"
            >
              <OutfitArt outfit={badge.id} className="h-5 w-7" />
              {badge.name} unlocked · {formatPeso(badge.amount, { whole: true })}
            </m.p>
          )}
        </AnimatePresence>

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
        </Link>
      </div>
    </section>
  );
}
