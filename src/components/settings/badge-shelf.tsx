"use client";

import { Check, Lock } from "lucide-react";
import { m, useAnimate, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Pig } from "@/components/pig/pig";
import { formatPeso } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { MILESTONES, milestone, type Outfit } from "@/modules/mascot/domain/milestones";
import { wearOutfitAction } from "@/modules/mascot/presentation/actions";

export function BadgeShelf({
  pigName,
  best,
  balance,
  outfit,
}: {
  pigName: string;
  best: number;
  balance: number;
  outfit: Outfit | null;
}) {
  const mounted = useMounted();
  const reduced = useReducedMotion() ?? false;
  const [worn, setWorn] = useState(outfit);
  const [, start] = useTransition();
  const [scope, animate] = useAnimate<HTMLUListElement>();
  const earned = MILESTONES.filter((m) => best >= m.amount).length;

  const wear = (next: Outfit | null) => {
    const prev = worn;
    setWorn(next);
    start(async () => {
      const res = await wearOutfitAction(next);
      if (!res.ok) {
        setWorn(prev);
        toast.error(res.error.message);
      }
    });
  };

  const wiggle = (id: Outfit) => {
    if (reduced) return;
    void animate(`[data-lock="${id}"]`, { rotate: [0, -14, 12, -8, 0] }, { duration: 0.45 });
  };

  return (
    <div className="@container grid gap-4">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <span
            aria-hidden
            className="absolute inset-x-2 bottom-1 h-2/3 rounded-full bg-pig/20 blur-xl"
          />
          {mounted && <Pig size={96} outfit={worn} name={pigName} className="relative" />}
        </div>
        <div className="min-w-0">
          <p className="font-medium">
            {worn ? `Wearing ${milestone(worn).name}` : `${pigName} is dressed down`}
          </p>
          <p className="text-body-sm text-fg-muted">
            {earned} of {MILESTONES.length} earned · best {formatPeso(best, { whole: true })}
          </p>
          <p className="mt-1 text-caption text-fg-muted">Tap a badge to wear it.</p>
        </div>
      </div>

      <ul ref={scope} className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        {MILESTONES.map((ms, i) => {
          const unlocked = best >= ms.amount;
          const wearing = worn === ms.id;
          const togo = Math.max(0, ms.amount - Math.max(0, balance));
          return (
            <m.li
              key={ms.id}
              initial={reduced ? false : { opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 20 }}
            >
              <button
                type="button"
                aria-pressed={unlocked ? wearing : undefined}
                aria-disabled={!unlocked || undefined}
                onClick={() => {
                  if (unlocked) wear(wearing ? null : ms.id);
                  else wiggle(ms.id);
                }}
                className={cn(
                  "relative grid w-full cursor-pointer justify-items-center gap-1 rounded-lg border px-2 pt-2 pb-2.5 text-center transition-colors duration-120",
                  wearing ? "border-pig bg-pig/10" : "border-border hover:bg-surface-2",
                )}
              >
                <span
                  aria-hidden
                  className={cn("block size-16", !unlocked && "opacity-35 grayscale")}
                >
                  {mounted && (
                    <Pig
                      size={64}
                      outfit={ms.id}
                      interactive={false}
                      name={pigName}
                      mood={unlocked ? "happy" : "sleeping"}
                    />
                  )}
                </span>
                {!unlocked && (
                  <span
                    data-lock={ms.id}
                    className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-surface-2"
                  >
                    <Lock className="size-3.5 text-fg-muted" aria-hidden />
                  </span>
                )}
                {wearing && (
                  <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-pig text-[#2b1d22]">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                )}
                <span className="text-body-sm leading-tight font-medium">
                  {ms.name}
                  {!unlocked && <span className="sr-only"> (locked)</span>}
                </span>
                <span className="text-caption whitespace-nowrap text-fg-muted tabular">
                  {unlocked
                    ? formatPeso(ms.amount, { whole: true })
                    : `${formatPeso(togo, { whole: true })} to go`}
                </span>
              </button>
            </m.li>
          );
        })}
      </ul>
    </div>
  );
}
