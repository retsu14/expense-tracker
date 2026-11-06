"use client";

import { useEffect } from "react";

import { useMounted } from "@/lib/use-mounted";
import { deriveMood, isNight } from "@/modules/mascot/domain/mood";
import { useMascotStore } from "@/stores/mascot-store";

import { Pig } from "./pig";

function greeting(hour: number) {
  if (isNight(hour)) return "Up late? I'm sleepy...";
  if (hour < 12) return "Good morning! Ready to save?";
  if (hour < 18) return "Good afternoon! Oink!";
  return "Good evening! How was your day?";
}

export function HomePig() {
  const mounted = useMounted();
  const setMood = useMascotStore((s) => s.setMood);
  const say = useMascotStore((s) => s.say);

  useEffect(() => {
    const hour = new Date().getHours();
    setMood(deriveMood({ hour, budgetUsedPct: null }));
    const t = setTimeout(() => {
      say(greeting(hour));
    }, 600);
    return () => {
      clearTimeout(t);
    };
  }, [setMood, say]);

  return (
    <div className="flex justify-center pt-12 md:pt-14">
      {mounted ? <Pig size={148} listen /> : <div className="size-37" aria-hidden />}
    </div>
  );
}
