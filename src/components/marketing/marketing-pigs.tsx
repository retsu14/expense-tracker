"use client";

import { useEffect } from "react";

import { Pig } from "@/components/pig/pig";
import { PigWithBubble } from "@/components/pig/pig-with-bubble";
import { useMounted } from "@/lib/use-mounted";
import { HEALTH_LABEL, HEALTH_LEVELS } from "@/modules/mascot/domain/health";
import { MILESTONES } from "@/modules/mascot/domain/milestones";
import { formatPeso } from "@/lib/money";
import { useMascotStore } from "@/stores/mascot-store";

export function HeroPig() {
  const mounted = useMounted();
  const say = useMascotStore((s) => s.say);

  useEffect(() => {
    const t = setTimeout(() => {
      say("Hi! I'm Oink. Tap me 🐷");
    }, 900);
    return () => {
      clearTimeout(t);
    };
  }, [say]);

  return (
    <div className="flex min-h-72 justify-center">
      {mounted && <PigWithBubble size={200} health="thriving" mood="happy" listen />}
    </div>
  );
}

const MOOD = { thriving: "happy", healthy: "happy", thin: "worried", famished: "sad" } as const;

export function HealthStates() {
  const mounted = useMounted();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {HEALTH_LEVELS.map((h) => (
        <li key={h} className="flex flex-col items-center gap-2 rounded-xl bg-surface p-4">
          <div className="size-28">
            {mounted && (
              <Pig size={112} health={h} mood={MOOD[h]} interactive={false} name="Oink" />
            )}
          </div>
          <span className="font-brand text-h3">{HEALTH_LABEL[h]}</span>
        </li>
      ))}
    </ul>
  );
}

export function BadgeParade() {
  const mounted = useMounted();
  return (
    <ul className="grid grid-cols-2 gap-3 xs:grid-cols-4">
      {MILESTONES.map((m) => (
        <li
          key={m.id}
          className="flex flex-col items-center gap-1 rounded-xl bg-surface p-3 text-center"
        >
          <div className="size-24">
            {mounted && <Pig size={96} outfit={m.id} mood="happy" name="Oink" />}
          </div>
          <span className="text-body-sm font-semibold">{m.name}</span>
          <span className="text-caption text-fg-muted tabular">
            {formatPeso(m.amount, { whole: true })}
          </span>
        </li>
      ))}
    </ul>
  );
}
